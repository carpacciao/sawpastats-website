import { eq } from 'drizzle-orm'
import { useDb } from '../../../db/client'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { table, fields } = getReferenceList(event)
  const id = getRouterId(event)
  const values = await readFields(event, fields, true)
  if (Object.keys(values).length === 0) throw createError({ statusCode: 400, statusMessage: 'Nothing to update' })

  try {
    const [row] = await useDb().update(table).set(values).where(eq(table.id, id)).returning()
    if (!row) throw createError({ statusCode: 404, statusMessage: 'Not found' })
    return row
  } catch (error) {
    throw toApiError(error)
  }
})
