import request from 'supertest'
import { app } from '../../index'
import { cleanupTestData, createTestUser, authHeader } from '../setup'

describe('Auth API Integration', () => {
  beforeEach(async () => {
    await cleanupTestData()
  })

  describe('POST /api/auth/login-email', () => {
    it('returns token for valid credentials', async () => {
      const user = await createTestUser({
        email: 'login@test.com',
        password: 'TestPass123!',
      })

      const res = await request(app)
        .post('/api/auth/login-email')
        .send({ email: 'login@test.com', password: 'TestPass123!' })

      expect(res.status).toBe(200)
      expect(res.body.token).toBeDefined()
      expect(res.body.user.id).toBe(user.id)
      expect(res.body.user.email).toBe('login@test.com')
    })

    it('returns 400 for wrong password', async () => {
      await createTestUser({
        email: 'wrongpass@test.com',
        password: 'TestPass123!',
      })

      const res = await request(app)
        .post('/api/auth/login-email')
        .send({ email: 'wrongpass@test.com', password: 'WrongPass123!' })

      expect(res.status).toBe(400)
      expect(res.body.error).toBeDefined()
    })

    it('returns 400 for non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login-email')
        .send({ email: 'nobody@test.com', password: 'AnyPass123!' })

      expect(res.status).toBe(400)
      expect(res.body.error).toBeDefined()
    })

    it('returns 400 for invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/login-email')
        .send({ email: 'not-an-email', password: 'TestPass123!' })

      expect(res.status).toBe(400)
    })

    it('returns 400 for short password', async () => {
      const res = await request(app)
        .post('/api/auth/login-email')
        .send({ email: 'test@test.com', password: 'short' })

      expect(res.status).toBe(400)
    })
  })

  describe('GET /api/auth/me', () => {
    it('returns current user info with valid token', async () => {
      const user = await createTestUser({ email: 'me@test.com' })

      const res = await request(app)
        .get('/api/auth/me')
        .set(authHeader(user.id))

      expect(res.status).toBe(200)
      expect(res.body.id).toBe(user.id)
      expect(res.body.email).toBe('me@test.com')
    })

    it('returns 401 without token', async () => {
      const res = await request(app).get('/api/auth/me')
      expect(res.status).toBe(401)
    })

    it('returns 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')

      expect(res.status).toBe(401)
    })
  })

  describe('PATCH /api/auth/profile', () => {
    it('updates user nickname', async () => {
      const user = await createTestUser({ email: 'profile@test.com' })

      const res = await request(app)
        .patch('/api/auth/profile')
        .set(authHeader(user.id))
        .send({ nickname: 'NewNickname' })

      expect(res.status).toBe(200)
      expect(res.body.nickname).toBe('NewNickname')
    })

    it('returns 401 without auth', async () => {
      const res = await request(app)
        .patch('/api/auth/profile')
        .send({ nickname: 'Any' })

      expect(res.status).toBe(401)
    })
  })

  describe('DELETE /api/auth/account', () => {
    it('deactivates user account', async () => {
      const user = await createTestUser({ email: 'delete@test.com' })

      const res = await request(app)
        .delete('/api/auth/account')
        .set(authHeader(user.id))

      expect(res.status).toBe(200)

      // 确认账号状态已变更
      const checkRes = await request(app)
        .get('/api/auth/me')
        .set(authHeader(user.id))

      // 被删除/禁用的用户无法再通过认证
      expect(checkRes.status).toBe(401)
    })
  })
})
