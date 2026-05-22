import { ensureHttps, sanitizeCollection } from '../lib/utils'

describe('ensureHttps', () => {
  it('returns null for null input', () => {
    expect(ensureHttps(null)).toBeNull()
  })

  it('upgrades http:// to https://', () => {
    expect(ensureHttps('http://example.com')).toBe('https://example.com')
    expect(ensureHttps('http://example.com/path?q=1')).toBe('https://example.com/path?q=1')
  })

  it('keeps https:// unchanged', () => {
    expect(ensureHttps('https://example.com')).toBe('https://example.com')
  })

  it('upgrades protocol-relative URL // to https://', () => {
    expect(ensureHttps('//example.com')).toBe('https://example.com')
  })

  it('keeps data URI unchanged', () => {
    const dataUri = 'data:image/png;base64,abc123'
    expect(ensureHttps(dataUri)).toBe(dataUri)
  })

  it('returns unknown format as-is', () => {
    expect(ensureHttps('ftp://example.com')).toBe('ftp://example.com')
  })
})

describe('sanitizeCollection', () => {
  it('upgrades coverImage http to https', () => {
    const input = { id: '1', coverImage: 'http://example.com/img.jpg' }
    const result = sanitizeCollection(input)
    expect(result.coverImage).toBe('https://example.com/img.jpg')
  })

  it('cleans SVG data URI to null', () => {
    const input = { id: '1', coverImage: 'data:image/svg+xml,<svg></svg>' }
    const result = sanitizeCollection(input)
    expect(result.coverImage).toBeNull()
  })

  it('returns input as-is when coverImage is null', () => {
    const input = { id: '1', coverImage: null }
    const result = sanitizeCollection(input)
    expect(result.coverImage).toBeNull()
  })
})
