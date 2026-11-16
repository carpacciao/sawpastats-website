import { schema, useDb } from '../../../db/client'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const values = await readGame(event)

  try {
    const [game] = await useDb().insert(schema.games).values(values).returning({ id: schema.games.id })
    return game!
  } catch (error) {
    throw toGameApiError(error)
  }
})
