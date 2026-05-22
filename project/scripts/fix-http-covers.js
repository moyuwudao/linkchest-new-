#!/usr/bin/env node
/**
 * 一键修复数据库中所有以 http:// 开头的 coverImage URL
 * 运行方式: node scripts/fix-http-covers.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 开始扫描数据库中的 HTTP coverImage...')

  // 1. 修复 Collection 表
  const collectionResult = await prisma.$executeRaw`
    UPDATE "Collection"
    SET "coverImage" = REPLACE("coverImage", 'http://', 'https://')
    WHERE "coverImage" LIKE 'http://%'
  `
  console.log(`✅ Collection 表修复完成，影响 ${collectionResult} 条记录`)

  // 2. 修复 ShareItem 表（分享快照中的封面）
  const shareItemResult = await prisma.$executeRaw`
    UPDATE "ShareItem"
    SET "coverImage" = REPLACE("coverImage", 'http://', 'https://')
    WHERE "coverImage" LIKE 'http://%'
  `
  console.log(`✅ ShareItem 表修复完成，影响 ${shareItemResult} 条记录`)

  // 3. 统计验证
  const remainingCollections = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM "Collection" WHERE "coverImage" LIKE 'http://%'
  `
  const remainingShareItems = await prisma.$queryRaw`
    SELECT COUNT(*) as count FROM "ShareItem" WHERE "coverImage" LIKE 'http://%'
  `
  console.log(`📊 剩余 HTTP coverImage: Collection=${remainingCollections[0]?.count || 0}, ShareItem=${remainingShareItems[0]?.count || 0}`)

  if ((remainingCollections[0]?.count || 0) === 0 && (remainingShareItems[0]?.count || 0) === 0) {
    console.log('🎉 所有 HTTP coverImage 已修复为 HTTPS')
  } else {
    console.log('⚠️ 仍有部分记录未修复，请检查')
  }
}

main()
  .catch(err => {
    console.error('❌ 修复失败:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
