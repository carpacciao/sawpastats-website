import { count } from 'drizzle-orm'
import { z } from 'zod'
import { schema, useDb } from '../../../db/client'

const PAGE_SIZE = 50
const pageSchema = z.coerce.number().int().min(1).catch(1)

// One page of games, with the total for the filters.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const filters = readGameFilters(event)
  const page = pageSchema.parse(getQuery(event).page)
  const where = gameFilterWhere(filters)

  const db = useDb()
  const [games, [totals]] = await db.batch([
    selectGamesWithNames()
      .where(where)
      .orderBy(...GAME_ORDER)
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(schema.games).where(where),
  ])

  return { games: games as GameWithNames[], total: totals!.total, page, pageSize: PAGE_SIZE }
})
