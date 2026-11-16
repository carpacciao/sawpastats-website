// Imports the games of the Google Sheet export (File > Download > .xlsx).
// Usage: pnpm db:import-sheet <file.xlsx> [--dry-run] [--replace]
//   --dry-run  parses and checks the file, writes nothing
//   --replace  deletes every game in the database first
// Without --replace, the import refuses to run if the database already has games.
import { count } from 'drizzle-orm'
import { schema, useDb } from '../../server/db/client'
import { seedReference } from '../reference'
import { readWorkbook, toRows } from './read'
import type { ParsedGame } from './read'

const BATCH_SIZE = 500

async function insertGames(games: ParsedGame[], replace: boolean) {
  const db = useDb()

  const [{ total }] = await db.select({ total: count() }).from(schema.games)
  if (total > 0 && !replace) {
    throw new Error(`The database already has ${total} games. Use --replace to delete them first.`)
  }

  await seedReference()
  const ids = async (table: typeof schema.killers | typeof schema.maps | typeof schema.mates | typeof schema.events) =>
    new Map(
      (await db.select({ id: table.id, name: table.name }).from(table)).map((r: { id: number; name: string }) => [
        r.name,
        r.id,
      ]),
    )
  const [killers, maps, mates, events] = await Promise.all([
    ids(schema.killers),
    ids(schema.maps),
    ids(schema.mates),
    ids(schema.events),
  ])
  const rows = toRows(games, { killers, maps, mates, events })

  // One batch runs as a single transaction: either every game is imported or none.
  const inserts = []
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    inserts.push(db.insert(schema.games).values(rows.slice(i, i + BATCH_SIZE)))
  }
  await db.batch([db.delete(schema.games), ...inserts])
}

const args = process.argv.slice(2)
const path = args.find((a) => !a.startsWith('--'))
if (!path) {
  console.error('Usage: pnpm db:import-sheet <file.xlsx> [--dry-run] [--replace]')
  process.exit(1)
}

const { games, errors, warnings, skipped } = await readWorkbook(path)
console.log(`\n${games.length} games read.`)
if (skipped.length) console.warn(`\n${skipped.length} games skipped:\n${skipped.join('\n')}`)
if (warnings.length) console.warn(`\n${warnings.length} warnings:\n${warnings.join('\n')}`)
if (errors.length) {
  console.error(`\n${errors.length} errors, nothing imported:\n${errors.join('\n')}`)
  process.exit(1)
}

if (args.includes('--dry-run')) {
  console.log('\nDry run, nothing imported.')
} else {
  await insertGames(games, args.includes('--replace'))
  console.log(`\n${games.length} games imported.`)
}
