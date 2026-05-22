/**
 * 清理收藏-分组重复关联脚本
 * 
 * 产品意图：一条收藏只能属于一个分组
 * 但由于历史 bug，数据库中可能存在一条收藏关联多个分组的情况
 * 
 * 本脚本：
 * 1. 找出所有关联了多个分组的收藏
 * 2. 只保留一个分组关联（优先保留默认分组，其次保留最新关联）
 * 3. 删除多余的关联行
 * 
 * 用法：
 *   node scripts/cleanup-duplicate-list-associations.js          # dry-run（仅报告，不修改）
 *   node scripts/cleanup-duplicate-list-associations.js --apply  # 实际执行清理
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const DEFAULT_LIST_NAMES = ['__default__', '我的收藏']

async function main() {
  const applyMode = process.argv.includes('--apply')

  console.log('=== 收藏-分组重复关联清理工具 ===')
  console.log(`模式: ${applyMode ? '⚠️  执行模式' : '🔍 Dry-run 模式（仅报告）'}`)
  console.log()

  // Step 1: 查找所有关联了多个分组的收藏
  const duplicates = await prisma.$queryRaw`
    SELECT 
      ctl."A" AS collection_id,
      COUNT(*) AS list_count,
      ARRAY_AGG(ctl."B") AS list_ids
    FROM "_CollectionToList" ctl
    GROUP BY ctl."A"
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC
  `

  if (duplicates.length === 0) {
    console.log('✅ 没有发现重复关联，数据已是干净的。')
    return
  }

  console.log(`❌ 发现 ${duplicates.length} 条收藏存在多个分组关联：\n`)

  // Step 2: 获取所有默认分组 ID
  const defaultLists = await prisma.list.findMany({
    where: {
      name: { in: DEFAULT_LIST_NAMES },
      parentId: null,
    },
    select: { id: true, name: true, userId: true },
  })
  const defaultListIds = new Set(defaultLists.map(l => l.id))

  // Step 3: 获取受影响收藏的详情
  const collectionIds = duplicates.map(d => d.collection_id)
  const collections = await prisma.collection.findMany({
    where: { id: { in: collectionIds } },
    select: {
      id: true,
      title: true,
      userId: true,
      lists: { select: { id: true, name: true } },
    },
  })
  const collectionMap = new Map(collections.map(c => [c.id, c]))

  let totalOrphans = 0
  const toDelete = [] // { collectionId, listIdsToDelete }

  for (const dup of duplicates) {
    const cid = dup.collection_id
    const coll = collectionMap.get(cid)
    if (!coll) continue

    const listIds = dup.list_ids
    let keepListId = null

    // 优先保留默认分组
    for (const lid of listIds) {
      if (defaultListIds.has(lid)) {
        keepListId = lid
        break
      }
    }

    // 没有默认分组则保留第一个（通常是最早关联的）
    if (!keepListId) {
      keepListId = listIds[0]
    }

    const listIdsToDelete = listIds.filter(lid => lid !== keepListId)
    totalOrphans += listIdsToDelete.length

    const keepList = coll.lists.find(l => l.id === keepListId)
    const removeLists = coll.lists.filter(l => listIdsToDelete.includes(l.id))

    console.log(`  📌 "${coll.title}" (id: ${cid.substring(0, 8)}...)`)
    console.log(`     保留: ${keepList?.name || keepListId.substring(0, 8)}...`)
    console.log(`     删除: ${removeLists.map(l => l.name || l.id.substring(0, 8)).join(', ')}`)
    console.log()

    toDelete.push({ collectionId: cid, listIdsToDelete, keepListId })
  }

  console.log(`\n📊 汇总: ${duplicates.length} 条收藏, ${totalOrphans} 条多余关联待清理`)

  if (!applyMode) {
    console.log('\n💡 使用 --apply 参数执行实际清理:')
    console.log('   node scripts/cleanup-duplicate-list-associations.js --apply')
    return
  }

  // Step 4: 执行清理
  console.log('\n🔧 开始清理...')

  for (const item of toDelete) {
    // 对每条收藏，将其 lists 关系设为只保留 keepListId
    await prisma.collection.update({
      where: { id: item.collectionId },
      data: {
        lists: { set: [{ id: item.keepListId }] },
      },
    })
  }

  console.log(`✅ 清理完成! 已修复 ${toDelete.length} 条收藏的分组关联`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
