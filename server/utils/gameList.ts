// The admin's game list and CSV export: the same filters, the same order, with names.
import { aliasedTable, and, desc, eq, getTableColumns, gte, isNull, lt, or, sql } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { z } from 'zod'
import { fromParisInput } from '../../shared/dates'
import { GAME_MODES } from '../../shared/enums'
import { schema, useDb } from '../db/client'

const optionalId = z.coerce.number().int().positive().optional()
const day = z.iso.date().optional()

const filtersSchema = z.object({
  mode: z.enum(GAME_MODES).optional(),
  eventId: optionalId,
  // As killer (2v8_killer): Saw's killer and the mate's. Otherwise each one matches either
  // column, so both together find the games with that pair of killers.
  killerId: optionalId,
  killer2Id: optionalId,
  mapId: optionalId,
  mateId: optionalId,
  // Days in Paris, both included.
  from: day,
  to: day,
  // Only the imported games, which have no date.
  undated: z.stringbool().optional(),
})

export type GameFilters = z.infer<typeof filtersSchema>

export function readGameFilters(event: H3Event) {
  const result = filtersSchema.safeParse(getQuery(event))
  if (!result.success) throw createError({ statusCode: 400, statusMessage: 'Invalid filters' })
  return result.data
}

// The start of a day in Paris.
function startOfDay(day: string) {
  return fromParisInput(`${day}T00:00`)
}

function nextDay(day: string) {
  return new Date(new Date(`${day}T00:00:00Z`).getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
}

export function gameFilterWhere(filters: GameFilters) {
  const { games } = schema
  const byRole = filters.mode === '2v8_killer'
  const anyKiller = (id: number) => or(eq(games.killerId, id), eq(games.killer2Id, id))
  return and(
    filters.mode ? eq(games.mode, filters.mode) : undefined,
    filters.eventId ? eq(games.eventId, filters.eventId) : undefined,
    filters.killerId ? (byRole ? eq(games.killerId, filters.killerId) : anyKiller(filters.killerId)) : undefined,
    filters.killer2Id ? (byRole ? eq(games.killer2Id, filters.killer2Id) : anyKiller(filters.killer2Id)) : undefined,
    filters.mapId ? eq(games.mapId, filters.mapId) : undefined,
    filters.mateId ? eq(games.mateId, filters.mateId) : undefined,
    filters.undated ? isNull(games.playedAt) : undefined,
    filters.from ? gte(games.playedAt, startOfDay(filters.from)) : undefined,
    filters.to ? lt(games.playedAt, startOfDay(nextDay(filters.to))) : undefined,
  )
}

const killer2 = aliasedTable(schema.killers, 'killer2')

// A game row with names. Declared by hand: the type drizzle infers for this join is too
// deep for TypeScript, and comes out as never.
export type GameWithNames = typeof schema.games.$inferSelect & {
  killer: string
  killer2: string | null
  map: string
  mate: string | null
  event: string | null
}

// Every column of the games, plus the names of what they point to.
export function selectGamesWithNames() {
  const { games, killers, maps, mates, events } = schema
  return useDb()
    .select({
      ...getTableColumns(games),
      killer: killers.name,
      killer2: killer2.name,
      map: maps.name,
      mate: mates.name,
      event: events.name,
    })
    .from(games)
    .innerJoin(killers, eq(games.killerId, killers.id))
    .leftJoin(killer2, eq(games.killer2Id, killer2.id))
    .innerJoin(maps, eq(games.mapId, maps.id))
    .leftJoin(mates, eq(games.mateId, mates.id))
    .leftJoin(events, eq(games.eventId, events.id))
}

// Newest first. Imported games have no date: they come last, in the sheet's order.
export const GAME_ORDER = [sql`${schema.games.playedAt} desc nulls last`, desc(schema.games.id)]
