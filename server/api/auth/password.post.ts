import { eq } from 'drizzle-orm'
import { schema, useDb } from '../../db/client'

const MIN_LENGTH = 8

export default defineEventHandler(async (event) => {
  const session = await requireAdmin(event)
  const body = await readBody<{ currentPassword?: unknown; newPassword?: unknown }>(event)
  const { currentPassword, newPassword } = body ?? {}

  if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'currentPassword and newPassword are required' })
  }
  if (newPassword.length < MIN_LENGTH) {
    throw createError({ statusCode: 400, statusMessage: `New password must be at least ${MIN_LENGTH} characters` })
  }

  const db = useDb()
  const admin = await db.query.admin.findFirst()
  if (!admin || !(await verifyPassword(currentPassword, admin.passwordHash))) {
    throw createError({ statusCode: 401, statusMessage: 'Wrong current password' })
  }

  await db
    .update(schema.admin)
    .set({ passwordHash: await hashPassword(newPassword), updatedAt: new Date() })
    .where(eq(schema.admin.id, admin.id))
  await deleteOtherSessions(session.id)

  return { ok: true }
})
