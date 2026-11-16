// The four reference lists the game form picks from, and what the admin can edit in each.
import { count, eq, getTableColumns, or } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { z } from 'zod'
import { schema, useDb } from '../db/client'

const name = z.string().trim().min(1).max(100)
const day = z.iso.date().nullable()

// The columns of games that point to a list.
type GameColumn = 'killerId' | 'killer2Id' | 'mapId' | 'mateId' | 'eventId'

export const REFERENCE_LISTS = {
  killers: {
    table: schema.killers,
    fields: z.object({ name, in2v8: z.boolean() }),
    // 2v8 games use the killer in either column.
    gameColumns: ['killerId', 'killer2Id'] as GameColumn[],
  },
  maps: {
    table: schema.maps,
    fields: z.object({ name, in2v8: z.boolean() }),
    gameColumns: ['mapId'] as GameColumn[],
  },
  mates: {
    table: schema.mates,
    fields: z.object({ name, archived: z.boolean() }),
    gameColumns: ['mateId'] as GameColumn[],
  },
  events: {
    table: schema.events,
    fields: z.object({ name, startsOn: day, endsOn: day }),
    gameColumns: ['eventId'] as GameColumn[],
  },
}

export type ReferenceListName = keyof typeof REFERENCE_LISTS

// The tables differ only by their extra columns, so the routes handle them through this
// common shape.
type ReferenceTable = typeof schema.killers

export function getReferenceList(event: H3Event) {
  const listName = getRouterParam(event, 'list')
  if (!listName || !Object.hasOwn(REFERENCE_LISTS, listName)) {
    throw createError({ statusCode: 404, statusMessage: 'Unknown list' })
  }
  const list = REFERENCE_LISTS[listName as ReferenceListName]
  return {
    table: list.table as unknown as ReferenceTable,
    fields: list.fields as z.ZodObject,
    gameColumns: list.gameColumns,
  }
}

export function getRouterId(event: H3Event) {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  return id
}

// Every row of a list, with the number of games that use it.
export function selectWithUsage(listName: ReferenceListName) {
  const { table, gameColumns } = REFERENCE_LISTS[listName]
  const games = schema.games
  return useDb()
    .select({ ...getTableColumns(table), games: count(games.id) })
    .from(table)
    .leftJoin(games, or(...gameColumns.map((column) => eq(games[column], table.id))))
    .groupBy(table.id)
}

export async function readFields(event: H3Event, fields: z.ZodObject, partial = false) {
  const result = (partial ? fields.partial() : fields).safeParse(await readBody(event))
  if (!result.success) throw createError({ statusCode: 400, statusMessage: 'Invalid fields' })
  const data = result.data as { startsOn?: string | null; endsOn?: string | null }
  if (data.startsOn && data.endsOn && data.endsOn < data.startsOn) {
    throw createError({ statusCode: 400, statusMessage: 'End date before start date' })
  }
  return result.data
}

// The Postgres error code of a failed query, if any (drizzle wraps the driver's error).
export function pgErrorCode(error: unknown) {
  let cause: unknown = error
  while (cause && typeof cause === 'object') {
    const code = (cause as { code?: unknown }).code
    if (typeof code === 'string') return code
    cause = (cause as { cause?: unknown }).cause
  }
}

// Turns the Postgres errors the admin can cause into API errors.
export function toApiError(error: unknown) {
  const code = pgErrorCode(error)
  if (code === '23505') return createError({ statusCode: 409, statusMessage: 'Name already used' })
  if (code === '23503') return createError({ statusCode: 409, statusMessage: 'Still used by games' })
  if (code === '23514') return createError({ statusCode: 400, statusMessage: 'Invalid fields' })
  return error
}
