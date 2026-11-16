import { eq } from 'drizzle-orm'
import { schema, useDb } from '../../../db/client'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterId(event)
  const values = await readGame(event)

  try {
    const [game] = await useDb()
      .update(schema.games)
      .set(values)
      .where(eq(schema.games.id, id))
      .returning({ id: schema.games.id })
    if (!game) throw createError({ statusCode: 404, statusMessage: 'Not found' })
    return game
  } catch (error) {
    throw toGameApiError(error)
  }
})
