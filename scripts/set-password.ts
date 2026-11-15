// Sets the admin password and logs out every session.
// Usage: pnpm admin:set-password <password>
//        pnpm admin:set-password --generate
import { randomBytes } from 'node:crypto'
import { schema, useDb } from '../server/db/client'
import { hashPassword } from '../server/utils/password'

const arg = process.argv[2]
if (!arg) {
  console.error('Usage: pnpm admin:set-password <password> | --generate')
  process.exit(1)
}

const generated = arg === '--generate'
const password = generated ? randomBytes(24).toString('base64url') : arg
const passwordHash = await hashPassword(password)

const db = useDb()
await db
  .insert(schema.admin)
  .values({ id: 1, passwordHash })
  .onConflictDoUpdate({ target: schema.admin.id, set: { passwordHash, updatedAt: new Date() } })
await db.delete(schema.sessions)

console.log('Admin password updated, all sessions logged out.')
if (generated) console.log(`New password (shown once): ${password}`)
