import { detectPlatform, getSupportedPlatformList, generateDefaultCover } from '../services/platforms'

describe('detectPlatform', () => {
  it('detects YouTube from various URL formats', () => {
    expect(detectPlatform('https://www.youtube.com/watch?v=abc123')).toBe('youtube')
    expect(detectPlatform('https://youtu.be/abc123')).toBe('youtube')
    expect(detectPlatform('https://youtube.com/shorts/abc123')).toBe('youtube')
  })

  it('detects Bilibili', () => {
    expect(detectPlatform('https://www.bilibili.com/video/BV1xx411c7mD')).toBe('bilibili')
  })

  it('detects Xiaohongshu', () => {
    expect(detectPlatform('https://www.xiaohongshu.com/explore/123')).toBe('xiaohongshu')
  })

  it('detects Zhihu', () => {
    expect(detectPlatform('https://www.zhihu.com/question/123')).toBe('zhihu')
  })

  it('returns other for unknown domains', () => {
    expect(detectPlatform('https://unknown-domain.com/page')).toBe('other')
  })

  it('returns other for invalid URLs', () => {
    expect(detectPlatform('not-a-url')).toBe('other')
  })
})

describe('getSupportedPlatformList', () => {
  it('returns a non-empty array', () => {
    const platforms = getSupportedPlatformList()
    expect(platforms.length).toBeGreaterThan(0)
  })

  it('each platform has required fields', () => {
    const platforms = getSupportedPlatformList()
    for (const p of platforms) {
      expect(p.key).toBeDefined()
      expect(p.name).toBeDefined()
      expect(p.domains).toBeInstanceOf(Array)
      expect(p.color).toBeDefined()
      expect(p.category).toBeDefined()
      expect(p.priority).toMatch(/^[SABC]$/)
    }
  })
})

describe('generateDefaultCover', () => {
  it('returns a valid SVG data URI', () => {
    const platform = {
      key: 'test',
      name: '测试',
      domains: ['test.com'],
      color: '#FF5733',
      category: 'test',
      priority: 'S' as const,
    }
    const cover = generateDefaultCover(platform)
    expect(cover).toMatch(/^data:image\/svg\+xml/)
    expect(cover).toContain(encodeURIComponent('测试'))
  })

  it('uses first character of platform name', () => {
    const platform = {
      key: 'youtube',
      name: 'YouTube',
      domains: ['youtube.com'],
      color: '#FF0000',
      category: 'video',
      priority: 'S' as const,
    }
    const cover = generateDefaultCover(platform)
    expect(cover).toContain('Y')
  })
})
