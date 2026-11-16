import { eq } from 'drizzle-orm'
import { schema, useDb } from '../../../db/client'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterId(event)

  const [game] = await useDb().delete(schema.games).where(eq(schema.games.id, id)).returning({ id: schema.games.id })
  if (!game) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  return { ok: true }
})
