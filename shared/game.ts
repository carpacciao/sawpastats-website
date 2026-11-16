// A game as the admin form sends it, validated the same way in the browser and on the
// server. Each mode only has its own fields (zod drops the others), and gameToRow() fills
// the rest of the row, so the checks in server/db/schema.ts always pass.
import { z } from 'zod'
import { FUN, GAMEPLAY_TAGS, HOOK_SKIPS, KILLER_BEHAVIORS, PARTY_SIZES, type GameMode } from './enums'

const id = z.number().int().positive()
const count = (max: number) => z.number().int().min(0).max(max)

// Survivors in the game: Saw's party in 1v4, or the 8 survivors in 2v8.
export function survivorCount(mode: GameMode) {
  return mode === '1v4' ? 4 : 8
}

export function generatorCount(mode: GameMode) {
  return mode === '1v4' ? 5 : 8
}

// Cheater is a verdict on its own: it can't be combined with other tags.
function gameplay(allowFairplay: boolean) {
  const tags = allowFairplay ? GAMEPLAY_TAGS : GAMEPLAY_TAGS.filter((tag) => tag !== 'fairplay')
  return z
    .array(z.enum(tags))
    .refine((list) => new Set(list).size === list.length, 'Duplicate tag')
    .refine((list) => !list.includes('cheater') || list.length === 1, 'Cheater is exclusive')
}

const common = {
  // ISO date-time, or null for the imported games, which have no date.
  playedAt: z.iso.datetime({ offset: true }).nullable(),
  mapId: id,
  killerId: id,
  fun: z.enum(FUN).nullable(),
  notes: z.string().trim().max(2000).nullable(),
}

const survivorSide = {
  killerBehavior: z.enum(KILLER_BEHAVIORS).nullable(),
  sawEscaped: z.boolean(),
  hatchEscape: z.boolean(),
  hookSkip: z.enum(HOOK_SKIPS),
}

export const gameSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('1v4'),
    ...common,
    ...survivorSide,
    killerBehavior: z.enum(KILLER_BEHAVIORS.filter((value) => value !== 'ragequit_abandon')).nullable(),
    eventId: id.nullable(),
    party: z.enum(['solo', 'duo', 'trio', 'quatuor', 'viewers']),
    gameplay: gameplay(false),
    ignoredSurvivors: count(2),
    escapes: count(4),
    survivorAbandons: count(4),
    generatorsLeft: count(5),
  }),
  z.object({
    mode: z.literal('2v8_survivor'),
    ...common,
    ...survivorSide,
    party: z.enum(PARTY_SIZES),
    killer2Id: id,
    gameplay: gameplay(false),
    escapes: count(8),
    survivorAbandons: count(8),
    bots: count(8),
    generatorsLeft: count(8),
  }),
  z.object({
    mode: z.literal('2v8_killer'),
    ...common,
    killer2Id: id,
    // Null: a random player.
    mateId: id.nullable(),
    gameplay: gameplay(true),
    mateGameplay: gameplay(true),
    escapes: count(8),
    survivorAbandons: count(8),
    bots: count(8),
    generatorsLeft: count(8),
  }),
])

export type GameInput = z.infer<typeof gameSchema>

// Every column of a game row, with the fields the mode doesn't have set to their empty
// value. Changing a game's mode then clears what the old mode had.
export function gameToRow(game: GameInput) {
  const isKiller = game.mode === '2v8_killer'
  return {
    mode: game.mode,
    playedAt: game.playedAt === null ? null : new Date(game.playedAt),
    mapId: game.mapId,
    killerId: game.killerId,
    fun: game.fun,
    notes: game.notes || null,
    eventId: game.mode === '1v4' ? game.eventId : null,
    party: isKiller ? null : game.party,
    killer2Id: game.mode === '1v4' ? null : game.killer2Id,
    mateId: isKiller ? game.mateId : null,
    gameplay: game.gameplay,
    ignoredSurvivors: game.mode === '1v4' ? game.ignoredSurvivors : 0,
    mateGameplay: isKiller ? game.mateGameplay : [],
    escapes: game.escapes,
    survivorAbandons: game.survivorAbandons,
    killerBehavior: isKiller ? null : game.killerBehavior,
    sawEscaped: isKiller ? null : game.sawEscaped,
    hatchEscape: isKiller ? null : game.hatchEscape,
    hookSkip: isKiller ? null : game.hookSkip,
    bots: game.mode === '1v4' ? null : game.bots,
    generatorsLeft: game.generatorsLeft,
  }
}

// Values that are allowed but probably a typo. A few imported games have them, so they
// are shown as warnings instead of blocking the save.
export function gameWarnings(game: GameInput) {
  const warnings: string[] = []
  const deaths = survivorCount(game.mode) - game.escapes
  if (game.survivorAbandons > deaths) {
    warnings.push('Plus d\'abandons que de morts : les survivants qui abandonnent comptent comme morts.')
  }
  if (game.mode !== '2v8_killer') {
    if (game.sawEscaped && game.escapes === 0) warnings.push('Saw est sorti, mais aucun survivant n\'est sorti.')
    if (!game.sawEscaped && deaths === 0) warnings.push('Tous les survivants sont sortis, sauf Saw.')
    if (game.hatchEscape && !game.sawEscaped) warnings.push('Sortie par la trappe, mais Saw n\'est pas sorti.')
  }
  return warnings
}
