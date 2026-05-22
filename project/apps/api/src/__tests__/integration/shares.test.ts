import request from 'supertest'
import { app } from '../../index'
import { cleanupTestData, createTestUser, authHeader } from '../setup'

describe('Shares API Integration', () => {
  beforeEach(async () => {
    await cleanupTestData()
  })

  describe('GET /api/shares', () => {
    it('returns empty list for new user', async () => {
      const user = await createTestUser({ email: 'shares1@test.com' })

      const res = await request(app)
        .get('/api/shares')
        .set(authHeader(user.id))

      expect(res.status).toBe(200)
      expect(Array.isArray(res.body.data)).toBe(true)
      expect(res.body.data.length).toBe(0)
    })

    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/shares')
      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/shares', () => {
    it('creates a new share with valid data', async () => {
      const user = await createTestUser({ email: 'shares2@test.com' })

      // 先创建一个 list 用于分享
      const listRes = await request(app)
        .post('/api/lists')
        .set(authHeader(user.id))
        .send({ name: 'Test List' })

      const listId = listRes.body.id

      const res = await request(app)
        .post('/api/shares')
        .set(authHeader(user.id))
        .send({
          type: 'MULTI_LIST',
          listId,
          title: 'My Share',
          description: 'Test description',
        })

      expect(res.status).toBe(201)
      expect(res.body.id).toBeDefined()
      expect(res.body.title).toBe('My Share')
      expect(res.body.shareUrl).toBeDefined()
    })

    it('returns 400 for missing required fields', async () => {
      const user = await createTestUser({ email: 'shares3@test.com' })

      const res = await request(app)
        .post('/api/shares')
        .set(authHeader(user.id))
        .send({ type: 'MULTI_LIST' })

      expect(res.status).toBe(400)
      expect(res.body.error).toBeDefined()
    })

    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/shares')
        .send({ type: 'MULTI_LIST', title: 'Test' })

      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/shares/:id/password', () => {
    it('returns password for share owner', async () => {
      const user = await createTestUser({ email: 'shares4@test.com' })

      const listRes = await request(app)
        .post('/api/lists')
        .set(authHeader(user.id))
        .send({ name: 'Test List' })

      const shareRes = await request(app)
        .post('/api/shares')
        .set(authHeader(user.id))
        .send({
          type: 'MULTI_LIST',
          listId: listRes.body.id,
          title: 'Protected Share',
          password: 'secret123',
        })

      const shareId = shareRes.body.id

      const res = await request(app)
        .get(`/api/shares/${shareId}/password`)
        .set(authHeader(user.id))

      expect(res.status).toBe(200)
      expect(res.body.password).toBe('secret123')
    })

    it('returns 403 for non-owner', async () => {
      const owner = await createTestUser({ email: 'owner@test.com' })
      const other = await createTestUser({ email: 'other@test.com' })

      const listRes = await request(app)
        .post('/api/lists')
        .set(authHeader(owner.id))
        .send({ name: 'Test List' })

      const shareRes = await request(app)
        .post('/api/shares')
        .set(authHeader(owner.id))
        .send({
          type: 'MULTI_LIST',
          listId: listRes.body.id,
          title: 'Protected Share',
          password: 'secret123',
        })

      const res = await request(app)
        .get(`/api/shares/${shareRes.body.id}/password`)
        .set(authHeader(other.id))

      expect(res.status).toBe(403)
    })
  })

  describe('DELETE /api/shares/:id', () => {
    it('deletes share for owner', async () => {
      const user = await createTestUser({ email: 'shares5@test.com' })

      const listRes = await request(app)
        .post('/api/lists')
        .set(authHeader(user.id))
        .send({ name: 'Test List' })

      const shareRes = await request(app)
        .post('/api/shares')
        .set(authHeader(user.id))
        .send({
          type: 'MULTI_LIST',
          listId: listRes.body.id,
          title: 'To Delete',
        })

      const deleteRes = await request(app)
        .delete(`/api/shares/${shareRes.body.id}`)
        .set(authHeader(user.id))

      expect(deleteRes.status).toBe(200)

      // 确认分享已删除
      const listRes2 = await request(app)
        .get('/api/shares')
        .set(authHeader(user.id))

      expect(listRes2.body.data.length).toBe(0)
    })
  })
})
