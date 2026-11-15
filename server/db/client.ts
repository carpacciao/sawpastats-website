import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

let instance: ReturnType<typeof createDb> | undefined

function createDb() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  return drizzle(url, { schema })
}

export function useDb() {
  instance ??= createDb()
  return instance
}

export { schema }
