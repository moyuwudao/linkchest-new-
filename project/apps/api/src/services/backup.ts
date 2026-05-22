import prisma from '../lib/prisma'
import { sendHtmlEmail } from './ses'
import logger from '../lib/logger'

// 备份频率配置
export type BackupFrequency = 'weekly' | 'monthly' | 'off'
export type BackupFormat = 'csv' | 'html' | 'json'

interface BackupSettings {
  backupFrequency: BackupFrequency
  backupFormat: BackupFormat
  backupLastSent?: string // ISO date
}

/**
 * 执行用户备份：导出收藏数据并发送邮件
 */
export async function executeUserBackup(userId: string, format: BackupFormat = 'csv'): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, username: true, nickname: true, lang: true },
    })

    if (!user?.email) {
      logger.warn({ userId }, '备份跳过：用户无邮箱')
      return false
    }

    // 获取收藏数据
    const collections = await prisma.collection.findMany({
      where: { userId, deletedAt: null },
      include: {
        tags: { select: { id: true, name: true } },
        lists: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (collections.length === 0) {
      logger.info({ userId }, '备份跳过：无收藏数据')
      return false
    }

    // 生成导出内容
    let content: string
    let mimeType: string
    let filename: string

    if (format === 'csv') {
      const BOM = '\uFEFF'
      const header = '标题,链接,平台,备注,标签,分组,创建时间\n'
      const escapeCsv = (val: string) => val.replace(/"/g, '""').replace(/\r\n/g, ' ').replace(/\n/g, ' ').replace(/\r/g, ' ')
      const rows = collections.map(c =>
        `"${escapeCsv(c.title || '')}","${escapeCsv(c.url)}","${escapeCsv(c.platform)}","${escapeCsv(c.note || '')}","${c.tags?.map(t => t.name).join(';') || ''}","${c.lists?.map(l => l.name).join(';') || ''}","${c.createdAt.toISOString()}"`
      ).join('\n')
      content = BOM + header + rows
      mimeType = 'text/csv'
      filename = `linkchest-backup-${new Date().toISOString().slice(0, 10)}.csv`
    } else if (format === 'html') {
      // 简化版 HTML 书签格式
      const lines: string[] = [
        '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
        '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
        '<TITLE>LinkChest Backup</TITLE>',
        '<H1>LinkChest Backup</H1>',
        '<DL><p>',
      ]
      for (const c of collections) {
        const addDate = Math.floor(c.createdAt.getTime() / 1000)
        lines.push(`    <DT><A HREF="${c.url}" ADD_DATE="${addDate}">${c.title || 'Untitled'}</A>`)
      }
      lines.push('</DL><p>')
      content = lines.join('\n')
      mimeType = 'text/html'
      filename = `linkchest-backup-${new Date().toISOString().slice(0, 10)}.html`
    } else {
      content = JSON.stringify({
        version: '1.0',
        exportedAt: new Date().toISOString(),
        count: collections.length,
        data: collections,
      }, null, 2)
      mimeType = 'application/json'
      filename = `linkchest-backup-${new Date().toISOString().slice(0, 10)}.json`
    }

    // 发送备份邮件
    // 注意：腾讯云 SES 模板邮件不支持附件，这里使用 HTML 邮件内嵌导出链接
    // 实际实现中，可以：
    // 1. 将备份文件上传到 COS，生成临时下载链接
    // 2. 在邮件中提供下载链接
    // 当前简化实现：发送通知邮件，引导用户到设置页手动导出

    const displayName = user.nickname || user.username || 'User'
    const isZh = user.lang === 'zh'
    const subject = isZh ? '链藏 - 你的定期备份已准备就绪' : 'LinkChest - Your periodic backup is ready'
    const htmlBody = isZh
      ? `<p>你好 ${displayName}，</p>
         <p>你的链藏定期备份已准备就绪。你共有 <strong>${collections.length}</strong> 条收藏。</p>
         <p>请登录 <a href="https://linkchest.net/settings">链藏设置页</a> 导出你的备份数据。</p>
         <p>备份格式：${format.toUpperCase()}</p>
         <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
         <p style="color:#999;font-size:12px">此邮件由链藏自动发送，如需修改备份设置请前往设置页。</p>`
      : `<p>Hi ${displayName},</p>
         <p>Your LinkChest periodic backup is ready. You have <strong>${collections.length}</strong> bookmarks.</p>
         <p>Please visit <a href="https://linkchest.net/settings">LinkChest Settings</a> to export your backup data.</p>
         <p>Backup format: ${format.toUpperCase()}</p>
         <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
         <p style="color:#999;font-size:12px">This email was sent automatically by LinkChest. To change backup settings, visit the Settings page.</p>`

    await sendHtmlEmail(
      [user.email],
      subject,
      htmlBody,
      { fromAlias: isZh ? '链藏' : 'LinkChest', triggerType: 0 }
    )

    // 更新用户设置中的最后备份时间
    const currentSettings = (await prisma.user.findUnique({
      where: { id: userId },
      select: { settings: true },
    }))?.settings as Record<string, unknown> || {}

    await prisma.user.update({
      where: { id: userId },
      data: {
        settings: {
          ...currentSettings,
          backupLastSent: new Date().toISOString(),
        },
      },
    })

    logger.info({ userId, format, count: collections.length }, '✅ 用户备份邮件已发送')
    return true
  } catch (error) {
    logger.error({ err: error instanceof Error ? error.message : String(error), userId }, '❌ 用户备份失败')
    return false
  }
}

/**
 * 批量执行到期备份
 * 由定时任务调用
 */
export async function processPendingBackups(): Promise<{ processed: number; success: number; failed: number }> {
  const now = new Date()
  let processed = 0
  let success = 0
  let failed = 0

  // 查找所有专业版及以上、且启用了自动备份的用户
  const users = await prisma.user.findMany({
    where: {
      userTier: { in: ['heavy', 'super'] },
      status: 'active',
      email: { not: null },
    },
    select: { id: true, settings: true },
  })

  for (const user of users) {
    const settings = (user.settings as Record<string, unknown>) || {}
    const frequency = settings.backupFrequency as BackupFrequency || 'off'
    const lastSent = settings.backupLastSent as string | undefined

    if (frequency === 'off') continue

    // 检查是否到期
    const lastSentDate = lastSent ? new Date(lastSent) : new Date(0)
    const daysSinceLastBackup = (now.getTime() - lastSentDate.getTime()) / (1000 * 60 * 60 * 24)

    const shouldBackup =
      (frequency === 'weekly' && daysSinceLastBackup >= 7) ||
      (frequency === 'monthly' && daysSinceLastBackup >= 30)

    if (!shouldBackup) continue

    processed++
    const format = (settings.backupFormat as BackupFormat) || 'csv'
    const result = await executeUserBackup(user.id, format)
    if (result) success++
    else failed++
  }

  return { processed, success, failed }
}
