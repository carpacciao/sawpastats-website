import { useDb } from '../../db/client'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ password?: unknown }>(event)
  if (typeof body?.password !== 'string' || !body.password) {
    throw createError({ statusCode: 400, statusMessage: 'Password is required' })
  }

  const admin = await useDb().query.admin.findFirst()
  if (!admin || !(await verifyPassword(body.password, admin.passwordHash))) {
    throw createError({ statusCode: 401, statusMessage: 'Wrong password' })
  }

  await createSession(event)
  return { ok: true }
})
