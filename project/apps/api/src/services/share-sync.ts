import prisma from '../lib/prisma'



/**
 * 一键导入：将分享内容一次性导入为本地分组
 * [MODIFIED] 移除 isPlaza 限制，允许从任意分享链接导入
 */
export async function importShare(
  shareId: string,
  userId: string,
  options: { syncTags?: boolean } = {}
): Promise<{ imported: number; listId: string }> {
  const share = await prisma.share.findUnique({
    where: { id: shareId },
    include: { shareItems: true },
  })

  if (!share) {
    throw new Error('SHARE_NOT_FOUND')
  }

  // 检查是否已导入
  const existingList = await prisma.list.findFirst({
    where: { userId, sourceShareId: shareId },
  })
  if (existingList) {
    throw new Error('ALREADY_IMPORTED')
  }

  // 创建导入分组
  const list = await prisma.list.create({
    data: {
      userId,
      name: share.title,
      sourceShareId: share.id,
      sourceType: 'import',
      depth: 0,
    },
  })

  let imported = 0

  for (const item of share.shareItems) {
    try {
      // 去重检查：已存在的收藏也要关联到新分组
      const existing = await prisma.collection.findFirst({
        where: { userId, url: item.url },
      })
      if (existing) {
        await prisma.collection.update({
          where: { id: existing.id },
          data: { lists: { connect: [{ id: list.id }] } },
        })
        continue
      }

      const tagIds: string[] = []

      // 可选同步标签
      if (options.syncTags && item.tags && Array.isArray(item.tags)) {
        for (const tag of item.tags as { nameCn: string; nameEn: string }[]) {
          const upserted = await prisma.tag.upsert({
            where: { userId_nameCn: { userId, nameCn: tag.nameCn } },
            create: {
              userId,
              name: tag.nameCn,
              nameCn: tag.nameCn,
              nameEn: tag.nameEn || tag.nameCn,
            },
            update: {},
          })
          tagIds.push(upserted.id)
        }
      }

      await prisma.collection.create({
        data: {
          userId,
          url: item.url,
          title: item.title,
          coverImage: item.coverImage,
          platform: item.platform,
          lists: { connect: [{ id: list.id }] },
          tags: tagIds.length > 0 ? { connect: tagIds.map((id) => ({ id })) } : undefined,
        },
      })

      imported++
    } catch (err) {
      console.error('导入单项失败:', err)
    }
  }

  return { imported, listId: list.id }
}

/**
 * 检查分组是否为订阅来源（禁止再次分享）
 */
export async function isSubscribedList(listId: string): Promise<boolean> {
  const list = await prisma.list.findUnique({
    where: { id: listId },
    select: { sourceType: true },
  })
  return list?.sourceType === 'subscribe'
}
