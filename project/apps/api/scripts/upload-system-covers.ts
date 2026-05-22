import fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import { PrismaClient } from '@prisma/client'
import COS from 'cos-nodejs-sdk-v5'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

const prisma = new PrismaClient()

// COS 配置
const cos = new COS({
  SecretId: process.env.COS_SECRET_ID!,
  SecretKey: process.env.COS_SECRET_KEY!,
})

const BUCKET = process.env.COS_BUCKET!
const REGION = process.env.COS_REGION || 'ap-guangzhou'
const COVER_DIR = path.resolve(__dirname, '../../../cover-processed')

async function uploadBuffer(key: string, buffer: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    cos.putObject(
      {
        Bucket: BUCKET,
        Region: REGION,
        Key: key,
        Body: buffer,
        ContentType: 'image/webp',
      },
      (err) => {
        if (err) reject(new Error(`COS 上传失败: ${err.message}`))
        else resolve()
      }
    )
  })
}

async function getSignedUrl(key: string, expires = 7 * 24 * 3600): Promise<string> {
  return new Promise((resolve, reject) => {
    cos.getObjectUrl(
      {
        Bucket: BUCKET,
        Region: REGION,
        Key: key,
        Expires: expires,
        Sign: true,
      },
      (err, data) => {
        if (err || !data.Url) reject(new Error(`COS 签名失败: ${err?.message || '未知错误'}`))
        else resolve(data.Url)
      }
    )
  })
}

async function main() {
  console.log('🚀 开始批量上传系统封面...')
  console.log(`📁 封面目录: ${COVER_DIR}`)

  // 检查封面目录是否存在
  try {
    await fs.access(COVER_DIR)
  } catch {
    console.error('❌ 封面目录不存在:', COVER_DIR)
    process.exit(1)
  }

  // 读取封面文件
  const files = (await fs.readdir(COVER_DIR)).filter((f) => f.toLowerCase().endsWith('.webp'))
  console.log(`📸 发现 ${files.length} 张封面图片`)

  if (files.length === 0) {
    console.log('⚠️ 没有需要上传的封面图片')
    process.exit(0)
  }

  let success = 0
  let failed = 0

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const filePath = path.join(COVER_DIR, file)

    try {
      console.log(`\n[${i + 1}/${files.length}] 处理: ${file}`)

      const buffer = await fs.readFile(filePath)
      console.log(`  文件大小: ${(buffer.length / 1024).toFixed(1)} KB`)

      // 读取图片元数据
      const metadata = await sharp(buffer).metadata()
      console.log(`  尺寸: ${metadata.width}x${metadata.height}`)

      const cosKey = `system-covers/${file}`

      // 上传至 COS
      await uploadBuffer(cosKey, buffer)
      console.log(`  ✅ 已上传至 COS: ${cosKey}`)

      // 生成签名 URL
      const cosUrl = await getSignedUrl(cosKey, 7 * 24 * 3600)
      const urlExpiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000)

      // 写入/更新数据库
      await prisma.systemCover.upsert({
        where: { cosKey },
        update: {
          cosUrl,
          urlExpiresAt,
          size: buffer.length,
          width: metadata.width ?? null,
          height: metadata.height ?? null,
        },
        create: {
          cosKey,
          cosUrl,
          urlExpiresAt,
          size: buffer.length,
          width: metadata.width ?? null,
          height: metadata.height ?? null,
          format: 'webp',
          name: file.replace(/\.webp$/i, ''),
          sortOrder: i,
        },
      })
      console.log(`  ✅ 已写入数据库`)

      success++
    } catch (err: unknown) {
      console.error(`  ❌ 处理失败: ${(err as Error).message}`)
      failed++
    }
  }

  console.log(`\n🎉 批量上传完成! 成功: ${success}, 失败: ${failed}`)
}

main()
  .catch((err) => {
    console.error('脚本执行失败:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
