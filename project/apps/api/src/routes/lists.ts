import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import prisma from '../lib/prisma'
import { Prisma } from '@prisma/client'
import { authenticate, AuthenticatedRequest } from '../middleware/auth'
import { DEFAULT_LIST_KEY, DEFAULT_LIST_DESC } from '../lib/config'
import { ListErrorCodes, CommonErrorCodes, errorResponse } from '../lib/errorCodes'
import { sanitizeCollection } from '../lib/utils'
import logger from '../lib/logger'
import { invalidateQuotaCache } from '../services/quota'

const router = Router()

interface ListNode {
  id: string;
  name: string;
  parentId: string | null;
  depth: number;
  isDefault?: boolean;
  sortOrder: number;
  createdAt: Date | string;
  children?: ListNode[];
  collectionCount?: number;
  totalCollectionCount?: number;
}

// 辅助函数：将扁平列表转换为树形结构
function buildTree(lists: ListNode[], parentId: string | null = null): ListNode[] {
  return lists
    .filter(list => list.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(list => ({
      ...list,
      children: buildTree(lists, list.id)
    }))
}

// 辅助函数：将树形结构扁平化为层级有序列表（父在前、子在后）
function flattenTree(tree: ListNode[]): ListNode[] {
  const result: ListNode[] = []
  for (const node of tree) {
    const { children, ...rest } = node
    result.push(rest as ListNode)
    if (children && children.length > 0) {
      result.push(...flattenTree(children))
    }
  }
  return result
}

// 辅助函数：获取每个分组的收藏 ID 列表（从隐式多对多关联表查询）
// 用于后续去重计算 totalCollectionCount
async function getCollectionIdsPerList(userId: string): Promise<Map<string, string[]>> {
  const rows = await prisma.$queryRaw<Array<{ B: string; A: string }>>`
    SELECT "B", "A" FROM "_CollectionToList"
    WHERE "B" IN (SELECT id FROM lists WHERE "userId" = ${userId})
      AND "A" IN (SELECT id FROM collections WHERE "userId" = ${userId} AND "deletedAt" IS NULL)
  `
  const map = new Map<string, string[]>()
  for (const row of rows) {
    if (!map.has(row.B)) map.set(row.B, [])
    map.get(row.B)!.push(row.A)
  }
  return map
}

// 辅助函数：计算分组的收藏计数（包含所有子分组的收藏，不去重）
// collectionCount: 只统计直接关联的收藏数
// totalCollectionCount: 包含所有子分组（递归）的收藏总数（直接收藏 + 所有子分组的直接收藏）
function calculateTotalCollectionCount(lists: ListNode[]): Map<string, number> {
  // 构建父子关系映射
  const childrenMap = new Map<string, string[]>();
  const listMap = new Map<string, ListNode>();
  lists.forEach(list => {
    listMap.set(list.id, list);
    if (list.parentId) {
      if (!childrenMap.has(list.parentId)) {
        childrenMap.set(list.parentId, []);
      }
      childrenMap.get(list.parentId)!.push(list.id);
    }
  });

  // 递归计算分组及其所有子分组的收藏总数（不去重，直接相加）
  function getTotalCount(listId: string): number {
    const list = listMap.get(listId);
    const directCount = list?.collectionCount || 0;
    const children = childrenMap.get(listId) || [];
    let total = directCount;
    for (const childId of children) {
      total += getTotalCount(childId);
    }
    return total;
  }

  const totalCountMap = new Map<string, number>();
  lists.forEach(list => {
    totalCountMap.set(list.id, getTotalCount(list.id));
  });

  return totalCountMap;
}

// 辅助函数：计算分组的深度（向上追溯）
async function calculateListDepth(listId: string, prismaClient: typeof prisma): Promise<number> {
  let depth = 0
  let currentId: string | null = listId
  
  while (currentId) {
    const parent = await prismaClient.list.findFirst({
      where: { id: currentId },
      select: { parentId: true }
    })
    if (!parent || !parent.parentId) break
    depth++
    currentId = parent.parentId
    if (depth >= 2) break // 最多计算到 depth=2
  }
  
  return depth
}

// 辅助函数：更新所有子分组的 depth（当分组被移动时调用）
async function updateChildrenDepth(listId: string, newDepth: number, prismaClient: typeof prisma): Promise<void> {
  const children = await prismaClient.list.findMany({
    where: { parentId: listId },
    select: { id: true }
  })
  
  for (const child of children) {
    await prismaClient.list.update({
      where: { id: child.id },
      data: { depth: newDepth + 1 }
    })
    await updateChildrenDepth(child.id, newDepth + 1, prismaClient)
  }
}

// 获取完整路径（用于前端显示 breadcrumb）
async function getListPath(listId: string, userId: string): Promise<{ id: string; name: string }[]> {
  const path: { id: string; name: string }[] = []
  let currentId: string | null = listId

  while (currentId) {
    const list = await prisma.list.findFirst({
      where: { id: currentId, userId },
      select: { id: true, name: true, parentId: true }
    })
    if (!list) break
    path.unshift({ id: list.id, name: list.name })
    currentId = list.parentId
  }

  return path
}

// 获取分组及其所有子分组的 ID 列表（递归）
async function getListAndDescendantIds(listId: string, userId: string): Promise<string[]> {
  const result: string[] = [];
  const visited = new Set<string>();

  async function collectChildren(parentId: string) {
    if (visited.has(parentId)) return; // 防止循环引用
    visited.add(parentId);

    // 把当前节点加入结果
    result.push(parentId);

    const children = await prisma.list.findMany({
      where: { parentId, userId },
      select: { id: true }
    });

    for (const child of children) {
      await collectChildren(child.id);
    }
  }

  // 从根节点开始递归
  await collectChildren(listId);
  return result;
}

// 获取所有分组（默认返回扁平列表，用于兼容性）
router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  const userId = req.user.id
  const { format } = req.query // format=tree 返回树形

  try {
    // 确保用户有默认分组
    let defaultList = await prisma.list.findFirst({
      where: { userId, name: DEFAULT_LIST_KEY, parentId: null },
    })
    if (!defaultList) {
      defaultList = await prisma.list.findFirst({
        where: { userId, name: '我的收藏', parentId: null },
      })
      if (!defaultList) {
        defaultList = await prisma.list.create({
          data: { userId, name: DEFAULT_LIST_KEY, description: DEFAULT_LIST_DESC },
        })
      }
    }

    const lists = await prisma.list.findMany({
      where: { userId },
      include: {
        collections: {
          where: { deletedAt: null },
        }
      },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    const formattedLists = lists.map(list => {
      return {
        ...list,
        collectionCount: list.collections.length,
        totalCollectionCount: list.collections.length, // 临时值，稍后会被覆盖
        isDefault: (list.name === DEFAULT_LIST_KEY || list.name === '我的收藏') && !list.parentId,
        collections: undefined,
      }
    })

    // 计算包含子分组的收藏总数（不去重）
    const totalCountMap = calculateTotalCollectionCount(formattedLists);
    formattedLists.forEach(list => {
      list.totalCollectionCount = totalCountMap.get(list.id) || list.collectionCount;
    });

    // 如果请求树形格式
    if (format === 'tree') {
      const tree = buildTree(formattedLists)
      return res.json({ data: tree })
    }

    res.json({ data: formattedLists })
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error) }, '获取分组失败')
    errorResponse(res, 500, ListErrorCodes.LIST_FETCH_FAILED)
  }
})

// 获取扁平列表（用于新增收藏页面选择器）
router.get('/flat', authenticate, async (req: AuthenticatedRequest, res) => {
  const userId = req.user.id

  try {
    const lists = await prisma.list.findMany({
      where: { userId },
      include: {
        collections: {
          where: { deletedAt: null },
        }
      },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    // 计算每个分组的深度和是否有子分组
    const listMap = new Map<string, any>()
    const parentIds = new Set(lists.map(l => l.parentId).filter(Boolean)) // 收集所有父ID

    const formattedLists = lists.map(list => {
      const formatted = {
        ...list,
        collectionCount: list.collections.length, // 直接关联的收藏数（过滤软删除）
        totalCollectionCount: list.collections.length, // 临时值，稍后会被覆盖
        isDefault: (list.name === DEFAULT_LIST_KEY || list.name === '我的收藏') && !list.parentId,
        hasChildren: parentIds.has(list.id), // 是否有子分组
        collections: undefined,
      }
      listMap.set(list.id, formatted)
      return formatted
    })

    // 计算包含子分组的收藏总数（不去重）
    const totalCountMap = calculateTotalCollectionCount(formattedLists);
    formattedLists.forEach(list => {
      list.totalCollectionCount = totalCountMap.get(list.id) || list.collectionCount;
    });

    // 为每个列表添加 depth 和 path
    const listsWithMeta = formattedLists.map(list => {
      const path: { id: string; name: string; isDefault?: boolean }[] = []
      let current: ListNode | undefined = list
      while (current && current.parentId) {
        const parent = listMap.get(current.parentId)
        if (parent) {
          path.unshift({ id: parent.id, name: parent.name, isDefault: parent.isDefault })
          current = parent
        } else {
          break
        }
      }
      return {
        ...list,
        depth: path.length,
        path,
        pathName: path.length > 0 ? path.map(p => p.name).join(' / ') : null,
      }
    })

    // 按树形层级 DFS 排序：一级分组 -> 二级分组 -> 三级分组
    const tree = buildTree(listsWithMeta)
    const result = flattenTree(tree)

    res.json({ data: result })
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error) }, '获取扁平分组失败')
    errorResponse(res, 500, ListErrorCodes.LIST_FETCH_FAILED)
  }
})

// 获取树形结构
router.get('/tree', authenticate, async (req: AuthenticatedRequest, res) => {
  const userId = req.user.id

  try {
    const lists = await prisma.list.findMany({
      where: { userId },
      include: {
        collections: {
          where: { deletedAt: null },
        }
      },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    })

    const formattedLists = lists.map(list => {
      return {
        ...list,
        collectionCount: list.collections.length,
        totalCollectionCount: list.collections.length, // 临时值，稍后会被覆盖
        isDefault: (list.name === DEFAULT_LIST_KEY || list.name === '我的收藏') && !list.parentId,
        collections: undefined,
      }
    })

    // 计算包含子分组的收藏总数（不去重）
    const totalCountMap = calculateTotalCollectionCount(formattedLists);
    formattedLists.forEach(list => {
      list.totalCollectionCount = totalCountMap.get(list.id) || list.collectionCount;
    });

    const tree = buildTree(formattedLists)

    res.json({ data: tree })
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error) }, '获取树形分组失败')
    errorResponse(res, 500, ListErrorCodes.LIST_FETCH_FAILED)
  }
})

// 获取单个分组路径
router.get('/:id/path', authenticate, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  const userId = req.user.id

  try {
    const path = await getListPath(id, userId)
    res.json({ data: path })
  } catch (error) {
    errorResponse(res, 500, ListErrorCodes.LIST_FETCH_FAILED)
  }
})

// 排序分组（必须在 /:id 之前注册）
router.post('/reorder', authenticate, [
  body('items').isArray({ min: 1 }).withMessage('请提供排序数据'),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED, errors.array())
  }

  const { items } = req.body
  const userId = req.user.id

  try {
    await prisma.$transaction(
      items.map((item: { id: string; sortOrder: number; parentId?: string | null }) =>
        prisma.list.updateMany({
          where: { id: item.id, userId },
          data: {
            sortOrder: item.sortOrder,
            parentId: item.parentId !== undefined ? item.parentId : undefined,
          },
        })
      )
    )
    res.json({ message: '排序已更新' })
  } catch (error) {
    errorResponse(res, 500, ListErrorCodes.LIST_REORDER_FAILED)
  }
})

// 获取单个分组详情
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  const userId = req.user.id

  try {
    const list = await prisma.list.findFirst({
      where: { id, userId },
      include: {
        parent: {
          select: { id: true, name: true }
        },
        children: {
          select: { id: true, name: true },
          orderBy: { sortOrder: 'asc' }
        },
        collections: {
          select: {
            id: true,
            title: true,
            coverImage: true,
            platform: true,
            url: true,
            note: true,
            createdAt: true,
            tags: { select: { id: true, name: true } },
            lists: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!list) {
      return errorResponse(res, 404, ListErrorCodes.LIST_NOT_FOUND)
    }

    const path = await getListPath(id, userId)

    res.json({
      data: {
        ...list,
        isDefault: (list.name === DEFAULT_LIST_KEY || list.name === '我的收藏') && !list.parentId,
        path,
        collections: list.collections?.map(sanitizeCollection),
      }
    })
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error) }, '获取分组详情失败')
    errorResponse(res, 500, ListErrorCodes.LIST_FETCH_FAILED)
  }
})

// 创建分组
router.post('/', authenticate, [
  body('name').isLength({ min: 1, max: 30 }).withMessage('分组名1-30字符'),
  body('description').optional().isLength({ max: 200 }),
  body('parentId').custom((value) => {
    // 允许 null 或字符串
    if (value !== null && value !== undefined && typeof value !== 'string') {
      throw new Error('parentId必须是字符串或null');
    }
    return true;
  }),
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED, errors.array())
  }

  let { name, description, parentId } = req.body
  const userId = req.user.id

  // 如果指定了 parentId，验证父分组存在且属于该用户
  if (parentId) {
    const parent = await prisma.list.findFirst({
      where: { id: parentId, userId }
    })
    if (!parent) {
      return errorResponse(res, 400, ListErrorCodes.LIST_PARENT_NOT_FOUND)
    }
    // 检查父分组深度，不能在 depth=2 的分组下创建子分组
    if (parent.depth >= 2) {
      return errorResponse(res, 400, ListErrorCodes.LIST_MAX_DEPTH_EXCEEDED)
    }
  }

  try {
    // 检查同一父分组下名称是否重复（精确匹配）
    const existingList = await prisma.list.findFirst({
      where: { userId, name, parentId: parentId || null }
    })
    if (existingList) {
      // 查找同名（精确匹配）的最大编号
      const sameNameLists = await prisma.list.findMany({
        where: { userId, parentId: parentId || null },
        select: { name: true },
      })
      let maxNum = 0
      // 转义特殊字符，精确匹配原名称
      const baseNamePattern = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)
      for (const l of sameNameLists) {
        const match = l.name.match(baseNamePattern)
        if (match) {
          // 找到精确匹配，说明是第一个
          maxNum = 0
          break
        }
      }
      if (maxNum === 0) {
        // 如果没有精确匹配原名的（第一个），查找已有的编号
        const numberedPattern = new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\((\\d+)\\)$`)
        for (const l of sameNameLists) {
          const match = l.name.match(numberedPattern)
          if (match && match[1]) {
            const num = parseInt(match[1])
            if (num > maxNum) maxNum = num
          }
        }
        name = `${name}(${maxNum + 1})`
      }
    }

    // 获取同父分组下的最大 sortOrder
    const maxSortOrder = await prisma.list.aggregate({
      where: { userId, parentId: parentId || null },
      _max: { sortOrder: true }
    })

    // 计算新分组的 depth
    const depth = parentId ? 1 : 0 // 临时计算，实际需要查父分组

    const list = await prisma.list.create({
      data: {
        userId,
        name,
        description,
        parentId: parentId || null,
        sortOrder: (maxSortOrder._max.sortOrder || 0) + 1,
        depth: 0, // 先设为0，创建后再更新准确值
      },
      include: {
        _count: { select: { collections: true } },
        parent: { select: { id: true, name: true, depth: true } },
      },
    })

    // 创建后更新正确的 depth
    const correctDepth = parentId ? (list.parent?.depth ?? 0) + 1 : 0
    await prisma.list.update({
      where: { id: list.id },
      data: { depth: correctDepth }
    })

    invalidateQuotaCache(userId).catch(() => {})

    res.status(201).json({
      data: {
        ...list,
        depth: correctDepth,
        collectionCount: list._count.collections,
        isDefault: false,
        _count: undefined,
        children: undefined,
      },
      renamed: name !== req.body.name,
      originalName: req.body.name,
    })
  } catch (error: unknown) {
    const errCode = (error as { code?: string })?.code
    logger.error({ err: error instanceof Error ? error.message : String(error), code: errCode }, '创建分组失败')
    if (errCode === 'P2002') {
      return errorResponse(res, 400, ListErrorCodes.LIST_NAME_EXISTS)
    }
    errorResponse(res, 500, ListErrorCodes.LIST_CREATE_FAILED)
  }
})

// 更新分组（支持移动到其他父分组）
router.put('/:id', authenticate, [
  body('name').optional().isLength({ min: 1, max: 30 }),
  body('description').optional().isLength({ max: 200 }),
  body('parentId').optional(), // null 表示移到根级别
], async (req: AuthenticatedRequest, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return errorResponse(res, 400, CommonErrorCodes.VALIDATION_FAILED, errors.array())
  }

  const { id } = req.params
  const { name, description, parentId } = req.body
  const userId = req.user.id

  try {
    // 检查分组是否存在
    const existingList = await prisma.list.findFirst({
      where: { id, userId }
    })
    if (!existingList) {
      return errorResponse(res, 404, ListErrorCodes.LIST_NOT_FOUND)
    }

    // 不能将自己设为父分组
    if (parentId === id) {
      return errorResponse(res, 400, ListErrorCodes.LIST_CANNOT_MOVE_TO_SELF)
    }

    // 不能移到自己的子分组下（循环引用检测）
    if (parentId) {
      let currentParentId = parentId
      const visited = new Set<string>()
      while (currentParentId) {
        if (visited.has(currentParentId)) break // 防止死循环
        visited.add(currentParentId)
        if (currentParentId === id) {
          return errorResponse(res, 400, ListErrorCodes.LIST_CANNOT_MOVE_TO_CHILD)
        }
        const parent = await prisma.list.findFirst({
          where: { id: currentParentId },
          select: { parentId: true }
        })
        currentParentId = parent?.parentId || null
      }
    }

    // 如果移动到新的父分组，检查名称是否重复
    if (parentId !== undefined && parentId !== existingList.parentId) {
      const targetParentId = parentId === null ? null : parentId
      const duplicate = await prisma.list.findFirst({
        where: { userId, name: name || existingList.name, parentId: targetParentId, id: { not: id } }
      })
      if (duplicate) {
        return errorResponse(res, 400, ListErrorCodes.LIST_NAME_EXISTS)
      }
    }

    const updateData: Prisma.ListUncheckedUpdateManyInput = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (parentId !== undefined) updateData.parentId = parentId === null ? null : parentId

    // 如果移动到新的父分组，检查父分组深度并更新当前分组及子分组的 depth
    if (parentId !== undefined && parentId !== existingList.parentId) {
      let newDepth = 0
      if (parentId) {
        const newParent = await prisma.list.findFirst({
          where: { id: parentId, userId },
          select: { depth: true }
        })
        if (!newParent) {
          return errorResponse(res, 400, ListErrorCodes.LIST_PARENT_NOT_FOUND)
        }
        if (newParent.depth >= 2) {
          return errorResponse(res, 400, ListErrorCodes.LIST_MAX_DEPTH_EXCEEDED)
        }
        newDepth = newParent.depth + 1
      }
      updateData.depth = newDepth

      // 更新当前分组
      await prisma.list.updateMany({
        where: { id, userId },
        data: updateData,
      })

      // 递归更新所有子分组的 depth
      await updateChildrenDepth(id, newDepth, prisma)
    } else {
      await prisma.list.updateMany({
        where: { id, userId },
        data: updateData,
      })
    }

    // 返回更新后的完整数据
    const updatedList = await prisma.list.findFirst({
      where: { id, userId },
      include: {
        _count: { select: { collections: true } },
        parent: { select: { id: true, name: true, depth: true } },
      },
    })

    res.json({
      data: {
        ...updatedList,
        collectionCount: updatedList?._count.collections || 0,
        isDefault: (updatedList?.name === DEFAULT_LIST_KEY || updatedList?.name === '我的收藏') && !updatedList?.parentId,
        _count: undefined,
        children: undefined,
      },
    })
  } catch (error: unknown) {
    const errCode = (error as { code?: string })?.code
    logger.error({ err: error instanceof Error ? error.message : String(error), code: errCode }, '更新分组失败')
    if (errCode === 'P2002') {
      return errorResponse(res, 400, ListErrorCodes.LIST_NAME_EXISTS)
    }
    errorResponse(res, 500, ListErrorCodes.LIST_UPDATE_FAILED)
  }
})

// 删除分组
router.delete('/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  const userId = req.user.id

  try {
    const list = await prisma.list.findFirst({
      where: { id, userId },
      include: {
        children: true, // 获取子分组
      }
    })

    if (!list) {
      return errorResponse(res, 404, ListErrorCodes.LIST_NOT_FOUND)
    }

    const isDefaultList = (list.name === DEFAULT_LIST_KEY || list.name === '我的收藏') && !list.parentId
    if (isDefaultList) {
      return errorResponse(res, 403, ListErrorCodes.LIST_DEFAULT_CANNOT_DELETE)
    }

    // 如果有子分组，将子分组提升到父级
    if (list.children.length > 0) {
      await prisma.list.updateMany({
        where: { id: { in: list.children.map(c => c.id) } },
        data: { parentId: list.parentId },
      })
    }

    // 将该分组中的收藏移到默认分组
    let defaultList = await prisma.list.findFirst({
      where: { userId, name: DEFAULT_LIST_KEY, parentId: null },
    })
    if (!defaultList) {
      defaultList = await prisma.list.findFirst({
        where: { userId, name: '我的收藏', parentId: null },
      })
    }
    if (!defaultList) {
      defaultList = await prisma.list.create({
        data: { userId, name: DEFAULT_LIST_KEY, description: DEFAULT_LIST_DESC },
      })
    }

    // 获取该分组下的所有收藏，将其移到默认分组
    const collectionsInList = await prisma.collection.findMany({
      where: { userId, deletedAt: null, lists: { some: { id } } },
      include: { lists: { select: { id: true } } },
    })

    for (const collection of collectionsInList) {
      const otherListIds = collection.lists.map(l => l.id).filter(lid => lid !== id)
      if (otherListIds.length === 0) {
        otherListIds.push(defaultList.id)
      }
      await prisma.collection.update({
        where: { id: collection.id },
        data: { lists: { set: otherListIds.map((lid: string) => ({ id: lid })) } },
      })
    }

    // 删除分组
    await prisma.list.deleteMany({
      where: { id, userId },
    })

    invalidateQuotaCache(userId).catch(() => {})

    res.json({
      message: '删除成功',
      movedChildren: list.children.length, // 返回移动的子分组数量
    })
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error) }, '删除分组错误')
    errorResponse(res, 500, ListErrorCodes.LIST_DELETE_FAILED)
  }
})

export default router