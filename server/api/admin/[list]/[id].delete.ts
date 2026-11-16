import { eq } from 'drizzle-orm'
import { useDb } from '../../../db/client'

// Only rows no game uses can be deleted (the foreign keys refuse the others): the admin
// merges those instead.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { table } = getReferenceList(event)
  const id = getRouterId(event)

  try {
    const [row] = await useDb().delete(table).where(eq(table.id, id)).returning()
    if (!row) throw createError({ statusCode: 404, statusMessage: 'Not found' })
    return { ok: true }
  } catch (error) {
    throw toApiError(error)
  }
})
