import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { schema, useDb } from '../db/client'

const COOKIE_NAME = 'sid'
const SESSION_DAYS = 30

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function createSession(event: H3Event) {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)

  await useDb().insert(schema.sessions).values({ tokenHash: hashToken(token), expiresAt })

  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    secure: !import.meta.dev,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  })
}

export async function findSession(event: H3Event) {
  const token = getCookie(event, COOKIE_NAME)
  if (!token) return null

  const [session] = await useDb()
    .select()
    .from(schema.sessions)
    .where(and(eq(schema.sessions.tokenHash, hashToken(token)), gt(schema.sessions.expiresAt, new Date())))
    .limit(1)

  return session ?? null
}

export async function requireAdmin(event: H3Event) {
  const session = await findSession(event)
  if (!session) throw createError({ statusCode: 401, statusMessage: 'Not logged in' })
  return session
}

export async function deleteSession(event: H3Event) {
  const token = getCookie(event, COOKIE_NAME)
  if (token) {
    await useDb().delete(schema.sessions).where(eq(schema.sessions.tokenHash, hashToken(token)))
  }
  deleteCookie(event, COOKIE_NAME, { path: '/' })
}
