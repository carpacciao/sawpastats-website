import { eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { schema, useDb } from '../../../../db/client'

const body = z.object({ into: z.number().int().positive() })

// Moves every game from one row to another, then deletes the first one. Fixes duplicates
// and spelling mistakes.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { table, gameColumns } = getReferenceList(event)
  const id = getRouterId(event)
  const parsed = body.safeParse(await readBody(event))
  if (!parsed.success || parsed.data.into === id) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid target' })
  }
  const { into } = parsed.data

  const db = useDb()
  const rows = await db.select().from(table).where(inArray(table.id, [id, into]))
  const source = rows.find((row) => row.id === id)
  if (!source || rows.length !== 2) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  // One transaction: the games move and the row goes, or nothing changes.
  await db.batch([
    ...gameColumns.map((column) =>
      db.update(schema.games).set({ [column]: into }).where(eq(schema.games[column], id)),
    ),
    // A killer or map that was in 2v8 keeps being available there under its new name.
    ...('in2v8' in source && source.in2v8 ? [db.update(table).set({ in2v8: true }).where(eq(table.id, into))] : []),
    db.delete(table).where(eq(table.id, id)),
  ] as unknown as Parameters<typeof db.batch>[0])

  return { ok: true }
})
