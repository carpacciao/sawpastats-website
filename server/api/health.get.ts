import { sql } from 'drizzle-orm'
import { useDb } from '../db/client'

export default defineEventHandler(async (event) => {
  try {
    const result = await useDb().execute<{ time: string }>(sql`select to_json(now()) #>> '{}' as time`)
    return { ok: true, db: 'up', time: result.rows[0]?.time ?? null }
  } catch (error) {
    console.error('Health check failed', error)
    setResponseStatus(event, 500)
    return { ok: false, db: 'down', time: null }
  }
})
