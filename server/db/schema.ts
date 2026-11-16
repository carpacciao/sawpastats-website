import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import {
  FUN,
  GAME_MODES,
  GAMEPLAY_TAGS,
  HOOK_SKIPS,
  KILLER_BEHAVIORS,
  PARTY_SIZES,
} from '../../shared/enums'

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

// Stats. Enum values are code identifiers (shared/enums.ts); the French labels are in
// shared/labels.ts.

// What Saw played. Limited-time modes (Chaos Shuffle, Lights Out, ...) are 1v4 events.
export const gameMode = pgEnum('game_mode', GAME_MODES)

// Who Saw played with. 'viewers' is always 4 people in 1v4, an unknown number in 2v8.
export const partySize = pgEnum('party_size', PARTY_SIZES)

// An empty list means "Normal". 'fairplay' only applies when Saw is the killer.
export const gameplayTag = pgEnum('gameplay_tag', GAMEPLAY_TAGS)

// The killer side of the sheet's "Abandons" column; the survivor count is separate.
export const killerBehavior = pgEnum('killer_behavior', KILLER_BEHAVIORS)

// Hook phases skipped because nobody came for the unhook.
export const hookSkip = pgEnum('hook_skip', HOOK_SKIPS)

export const fun = pgEnum('fun', FUN)

// Every killer is available in 1v4; only some of them in 2v8.
export const killers = pgTable('killers', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: text('name').notNull().unique(),
  in2v8: boolean('in_2v8').notNull().default(false),
})

export const maps = pgTable('maps', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: text('name').notNull().unique(),
  in2v8: boolean('in_2v8').notNull().default(false),
})

// Players who play the second killer with Saw in 2v8. Archived mates are hidden from the
// game form but stay in the stats.
export const mates = pgTable('mates', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: text('name').notNull().unique(),
  archived: boolean('archived').notNull().default(false),
})

// In-game events and limited-time modes (Noël 2024, Chaos Shuffle, ...), an optional
// label on a 1v4 game. The game form preselects the event whose dates include today.
export const events = pgTable(
  'events',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    name: text('name').notNull().unique(),
    // Days in Europe/Paris, both included. Null for modes with no fixed dates.
    startsOn: date('starts_on'),
    endsOn: date('ends_on'),
  },
  (t) => [check('events_dates', sql`${t.endsOn} >= ${t.startsOn}`)],
)

const IS_2V8 = sql.raw(`mode in ('2v8_survivor', '2v8_killer')`)
const SAW_KILLER = sql.raw(`mode = '2v8_killer'`)

// One row per game. Columns that only exist in some modes are nullable, and the checks
// below tie them to the mode. Imported games keep the sheet's order through their id.
export const games = pgTable(
  'games',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    mode: gameMode('mode').notNull(),
    eventId: integer('event_id').references(() => events.id),
    // Null for games imported from the sheet, which has no dates.
    playedAt: timestamp('played_at', { withTimezone: true }),
    // Null in 2v8 as killer: the mate plays the other killer.
    party: partySize('party'),
    mapId: integer('map_id')
      .notNull()
      .references(() => maps.id),
    // 1v4: the killer. 2v8 as survivor: killer 1. 2v8 as killer: Saw's killer.
    killerId: integer('killer_id')
      .notNull()
      .references(() => killers.id),
    // 2v8 only. As survivor: killer 2. As killer: the mate's killer.
    killer2Id: integer('killer2_id').references(() => killers.id),
    // 2v8 as killer only. Null there means a random player.
    mateId: integer('mate_id').references(() => mates.id),
    // As survivor: how the killers played. As killer: how Saw played.
    gameplay: gameplayTag('gameplay').array().notNull().default([]),
    // 1v4 only: survivors the killer ignored (the sheet's "3v1" = 1, "2v1" = 2).
    ignoredSurvivors: smallint('ignored_survivors').notNull().default(0),
    mateGameplay: gameplayTag('mate_gameplay').array().notNull().default([]),
    // Deaths (kills when Saw is the killer) = survivors (4 or 8) - escapes.
    escapes: smallint('escapes').notNull(),
    survivorAbandons: smallint('survivor_abandons').notNull().default(0),
    killerBehavior: killerBehavior('killer_behavior'),
    // Survivor modes only.
    sawEscaped: boolean('saw_escaped'),
    hatchEscape: boolean('hatch_escape'),
    hookSkip: hookSkip('hook_skip'),
    bots: smallint('bots'),
    generatorsLeft: smallint('generators_left').notNull(),
    fun: fun('fun'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('games_mode_idx').on(t.mode),
    index('games_map_idx').on(t.mapId),
    index('games_killer_idx').on(t.killerId),
    index('games_killer2_idx').on(t.killer2Id),
    index('games_event_idx').on(t.eventId),
    check(
      'games_counts',
      sql`${t.escapes} between 0 and (case when ${IS_2V8} then 8 else 4 end)
        and ${t.survivorAbandons} between 0 and (case when ${IS_2V8} then 8 else 4 end)
        and ${t.generatorsLeft} between 0 and (case when ${IS_2V8} then 8 else 5 end)
        and (${t.bots} is null or ${t.bots} between 0 and 8)
        and ${t.ignoredSurvivors} between 0 and (case when ${IS_2V8} then 0 else 2 end)`,
    ),
    check('games_event_1v4', sql`${t.eventId} is null or not ${IS_2V8}`),
    check(
      'games_2v8_fields',
      sql`(${IS_2V8}) = (${t.killer2Id} is not null) and (${IS_2V8}) = (${t.bots} is not null)`,
    ),
    check(
      'games_party',
      sql`case
        when ${SAW_KILLER} then ${t.party} is null
        when ${IS_2V8} then ${t.party} is not null
        else ${t.party} in ('solo', 'duo', 'trio', 'quatuor', 'viewers')
      end`,
    ),
    check(
      'games_survivor_fields',
      sql`(not ${SAW_KILLER}) = (${t.sawEscaped} is not null)
        and (not ${SAW_KILLER}) = (${t.hatchEscape} is not null)
        and (not ${SAW_KILLER}) = (${t.hookSkip} is not null)`,
    ),
    check(
      'games_killer_fields',
      sql`${SAW_KILLER} or (${t.mateId} is null
        and cardinality(${t.mateGameplay}) = 0
        and not 'fairplay' = any(${t.gameplay}))`,
    ),
    check(
      'games_survivor_only',
      sql`not ${SAW_KILLER} or ${t.killerBehavior} is null`,
    ),
  ],
)
