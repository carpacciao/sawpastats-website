import { desc } from 'drizzle-orm'
import { schema, useDb } from '../../../db/client'

// What the new game form starts from: the context of the last game logged. The form
// only keeps what usually stays the same between two games (see app/utils/gameDraft.ts).
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { games } = schema

  const [last] = await useDb()
    .select({
      mode: games.mode,
      party: games.party,
      mateId: games.mateId,
      killerId: games.killerId,
      killer2Id: games.killer2Id,
    })
    .from(games)
    .orderBy(desc(games.id))
    .limit(1)

  return last ?? null
})
