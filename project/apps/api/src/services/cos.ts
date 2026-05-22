import COS from 'cos-nodejs-sdk-v5'
import { COS_CONFIG } from '../lib/config'

let cosClient: COS | null = null

export function isCosConfigured(): boolean {
  return !!(COS_CONFIG.secretId && COS_CONFIG.secretKey && COS_CONFIG.bucket)
}

function getCosClient(): COS {
  if (cosClient) return cosClient
  if (!isCosConfigured()) {
    throw new Error('COS_NOT_CONFIGURED')
  }
  cosClient = new COS({
    SecretId: COS_CONFIG.secretId,
    SecretKey: COS_CONFIG.secretKey,
  })
  return cosClient
}

/**
 * 上传文件到 COS
 * @param key COS 对象键
 * @param buffer 文件 Buffer
 * @param contentType Content-Type
 */
export async function uploadToCos(
  key: string,
  buffer: Buffer,
  contentType = 'image/webp'
): Promise<void> {
  const client = getCosClient()
  await new Promise<void>((resolve, reject) => {
    client.putObject(
      {
        Bucket: COS_CONFIG.bucket,
        Region: COS_CONFIG.region,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      },
      (err) => {
        if (err) reject(new Error(`COS 上传失败: ${err.message}`))
        else resolve()
      }
    )
  })
}

/**
 * 从 COS 删除对象
 */
export async function deleteFromCos(key: string): Promise<void> {
  const client = getCosClient()
  await new Promise<void>((resolve, reject) => {
    client.deleteObject(
      {
        Bucket: COS_CONFIG.bucket,
        Region: COS_CONFIG.region,
        Key: key,
      },
      (err) => {
        if (err) reject(new Error(`COS 删除失败: ${err.message}`))
        else resolve()
      }
    )
  })
}

/**
 * 生成临时签名 URL
 * @param key COS 对象键
 * @param expires 有效期（秒）
 */
export async function getSignedUrl(key: string, expires = 3600): Promise<string> {
  const client = getCosClient()
  return new Promise((resolve, reject) => {
    client.getObjectUrl(
      {
        Bucket: COS_CONFIG.bucket,
        Region: COS_CONFIG.region,
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

/**
 * 批量删除 COS 对象
 */
export async function batchDeleteFromCos(keys: string[]): Promise<void> {
  if (keys.length === 0) return
  const client = getCosClient()
  await new Promise<void>((resolve, reject) => {
    client.deleteMultipleObject(
      {
        Bucket: COS_CONFIG.bucket,
        Region: COS_CONFIG.region,
        Objects: keys.map((k) => ({ Key: k })),
      },
      (err) => {
        if (err) reject(new Error(`COS 批量删除失败: ${err.message}`))
        else resolve()
      }
    )
  })
}

/**
 * 生成 COS 对象键（按用户ID分目录）
 */
export function generateCosKey(userId: string, filename: string): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.random().toString(36).slice(2, 10)
  return `covers/${userId}/${date}/${random}-${filename}`
}

/**
 * 生成头像 COS 对象键（固定路径，覆盖式上传）
 */
export function generateAvatarCosKey(userId: string): string {
  return `avatars/${userId}/avatar.webp`
}
