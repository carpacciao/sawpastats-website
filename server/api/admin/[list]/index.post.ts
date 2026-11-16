import { useDb } from '../../../db/client'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const { table, fields } = getReferenceList(event)
  const values = await readFields(event, fields)

  try {
    const [row] = await useDb().insert(table).values(values as typeof table.$inferInsert).returning()
    return row
  } catch (error) {
    throw toApiError(error)
  }
})
