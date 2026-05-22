import { Router } from 'express'
import { body, query, validationResult } from 'express-validator'
import prisma from '../../lib/prisma'
import { Prisma } from '@prisma/client'
import { authenticate, AuthenticatedRequest } from '../../middleware/auth'
import { DEFAULT_LIST_KEY, DEFAULT_LIST_DESC } from '../../lib/config'
import { detectPlatform, getSupportedPlatformList } from '../../services/platforms'
import { fetchUrlMetadata } from '../../services/metadata'
import { parseShareInput } from '../../services/share-parser'
import { checkQuota, checkQuotaBatch } from '../../services/quota'
import { enqueueMetadataFetch } from '../../services/metadata-queue'
import fetch from 'node-fetch'
import { CollectionErrorCodes, ListErrorCodes, CommonErrorCodes, UploadErrorCodes, QuotaErrorCodes, errorResponse } from '../../lib/errorCodes'
import { sanitizeCollection, ensureHttps } from '../../lib/utils'
import logger from '../../lib/logger'
import { isURL } from 'validator'

// ===== HTML 导入/导出辅助函数 =====

/**
 * 解析 Netscape Bookmark Format HTML
 * 返回扁平化的收藏列表，带 listName（超过3层扁平化到第3层）
 */
function parseBookmarkHtml(html: string): { url: string; title: string; listName: string | null }[] {
  const results: { url: string; title: string; listName: string | null }[] = []
  const folderStack: { name: string; depth: number }[] = []
  let dlDepth = 0

  for (const rawLine of html.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    if (/<DL>/i.test(line)) {
      dlDepth++
      continue
    }
    if (/<\/DL>/i.test(line)) {
      dlDepth = Math.max(0, dlDepth - 1)
      while (folderStack.length > 0 && folderStack[folderStack.length - 1].depth > dlDepth) {
        folderStack.pop()
      }
      continue
    }

    const h3Match = line.match(/<H3[^>]*>(.*?)<\/H3>/i)
    if (h3Match) {
      const name = h3Match[1].replace(/<[^>]+>/g, '').trim()
      if (!name) continue
      if (folderStack.length >= 3) {
        folderStack[2] = { name, depth: dlDepth }
      } else {
        folderStack.push({ name, depth: dlDepth })
      }
      continue
    }

    const aMatch = line.match(/<A\s+[^>]*HREF=["']([^"']+)["'][^>]*>(.*?)<\/A>/i)
    if (aMatch) {
      const url = aMatch[1].trim()
      const title = aMatch[2].replace(/<[^>]+>/g, '').trim()
      if (url && url.startsWith('http')) {
        const listName = folderStack.length > 0 ? folderStack[folderStack.length - 1].name : null
        results.push({ url, title, listName })
      }
    }
  }

  return results
}

/**
 * 生成 Netscape Bookmark Format HTML
 */
function generateBookmarkHtml(collections: { id: string; title: string; url: string; coverImage?: string | null; createdAt: Date; lists: { name: string }[] }[], lists: { name: string }[], includeCover: boolean = false): string {
  // 按列表分组
  const byList = new Map<string, typeof collections>()
  const noList: typeof collections = []

  for (const c of collections) {
    if (c.lists && c.lists.length > 0) {
      for (const l of c.lists) {
        if (!byList.has(l.name)) byList.set(l.name, [])
        byList.get(l.name)!.push(c)
      }
    } else {
      noList.push(c)
    }
  }

  const lines: string[] = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>',
    '<H1>Bookmarks</H1>',
    '<DL><p>',
  ]

  // 无分组的收藏
  if (noList.length > 0) {
    lines.push('    <DT><H3>Ungrouped</H3>')
    lines.push('    <DL><p>')
    for (const c of noList) {
      const addDate = Math.floor(c.createdAt.getTime() / 1000)
      const coverAttr = (includeCover && c.coverImage) ? ` ICON="${escapeHtml(c.coverImage)}"` : ''
      lines.push(`        <DT><A HREF="${escapeHtml(c.url)}" ADD_DATE="${addDate}"${coverAttr}>${escapeHtml(c.title || 'Untitled')}</A>`)
    }
    lines.push('    </DL><p>')
  }

  // 有分组的收藏
  for (const [listName, items] of byList) {
    lines.push(`    <DT><H3>${escapeHtml(listName)}</H3>`)
    lines.push('    <DL><p>')
    for (const c of items) {
      const addDate = Math.floor(c.createdAt.getTime() / 1000)
      const coverAttr = (includeCover && c.coverImage) ? ` ICON="${escapeHtml(c.coverImage)}"` : ''
      lines.push(`        <DT><A HREF="${escapeHtml(c.url)}" ADD_DATE="${addDate}"${coverAttr}>${escapeHtml(c.title || '无标题')}</A>`)
    }
    lines.push('    </DL><p>')
  }

  lines.push('</DL><p>')
  return lines.join('\n')
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

