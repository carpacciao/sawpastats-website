import { sql } from 'drizzle-orm'
import { check, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core'

// The single shared admin account: exactly one row, id = 1.
export const admin = pgTable(
  'admin',
  {
    id: integer('id').primaryKey().default(1),
    passwordHash: text('password_hash').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [check('admin_single_row', sql`${t.id} = 1`)],
)

export const sessions = pgTable('sessions', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
