import type { H3Event } from 'h3'
import { gameSchema, gameToRow } from '../../shared/game'

// The request body as a full game row, or a 400.
export async function readGame(event: H3Event) {
  const result = gameSchema.safeParse(await readBody(event))
  if (!result.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid game', data: result.error.issues })
  }
  return gameToRow(result.data)
}

export function toGameApiError(error: unknown) {
  const code = pgErrorCode(error)
  if (code === '23503') return createError({ statusCode: 400, statusMessage: 'Unknown killer, map, mate or event' })
  if (code === '23514') return createError({ statusCode: 400, statusMessage: 'Invalid game' })
  return error
}
