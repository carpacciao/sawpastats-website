// The game form's state. It holds every field of every mode, so switching modes keeps
// what still applies; gameSchema drops the rest when the form is sent.
import type { Fun, GameMode, GameplayTag, HookSkip, KillerBehavior, PartySize } from '#shared/enums'
import { survivorCount, type GameInput } from '#shared/game'
import { fromParisInput, toParisInput } from '#shared/dates'

export interface GameDraft {
  mode: GameMode
  // Paris wall time ('2026-11-16T14:03'). Empty: now for a new game, no date when editing.
  playedAt: string
  eventId: number | null
  party: PartySize
  killerId: number | undefined
  killer2Id: number | undefined
  mateId: number | null
  mapId: number | undefined
  gameplay: GameplayTag[]
  ignoredSurvivors: number
  mateGameplay: GameplayTag[]
  // Kills when Saw is the killer. The database stores escapes = survivors - deaths.
  deaths: number
  survivorAbandons: number
  killerBehavior: KillerBehavior | null
  sawEscaped: boolean
  hatchEscape: boolean
  hookSkip: HookSkip
  bots: number
  generatorsLeft: number
  fun: Fun | null
  notes: string
}

// The fields that change every game, at their most common value.
function perGameDefaults() {
  return {
    playedAt: '',
    mapId: undefined,
    gameplay: [],
    ignoredSurvivors: 0,
    mateGameplay: [],
    deaths: 0,
    survivorAbandons: 0,
    killerBehavior: null,
    sawEscaped: false,
    hatchEscape: false,
    hookSkip: 'none',
    bots: 0,
    generatorsLeft: 0,
    fun: 'normal',
    notes: '',
  } satisfies Partial<GameDraft>
}

// The context of the previous game, kept for the next one: newDraft(draft) starts the
// next game.
type Context = Pick<GameDraft, 'mode' | 'eventId' | 'party' | 'mateId' | 'killerId' | 'killer2Id'>

export function newDraft(context: Partial<Context> = {}): GameDraft {
  const mode = context.mode ?? '1v4'
  return {
    mode,
    eventId: context.eventId ?? null,
    party: context.party ?? 'solo',
    mateId: context.mateId ?? null,
    // Saw plays the same killer with the same mate for a whole session. As survivor the
    // killers change every game.
    killerId: mode === '2v8_killer' ? context.killerId : undefined,
    killer2Id: mode === '2v8_killer' ? context.killer2Id : undefined,
    ...perGameDefaults(),
  }
}

// A game from GET /api/admin/games/:id.
interface GameRow {
  mode: GameMode
  playedAt: string | null
  eventId: number | null
  party: PartySize | null
  killerId: number
  killer2Id: number | null
  mateId: number | null
  mapId: number
  gameplay: GameplayTag[]
  ignoredSurvivors: number
  mateGameplay: GameplayTag[]
  escapes: number
  survivorAbandons: number
  killerBehavior: KillerBehavior | null
  sawEscaped: boolean | null
  hatchEscape: boolean | null
  hookSkip: HookSkip | null
  bots: number | null
  generatorsLeft: number
  fun: Fun | null
  notes: string | null
}

export function draftFromGame(game: GameRow): GameDraft {
  return {
    ...newDraft(),
    mode: game.mode,
    playedAt: game.playedAt ? toParisInput(new Date(game.playedAt)) : '',
    eventId: game.eventId,
    party: game.party ?? 'solo',
    killerId: game.killerId,
    killer2Id: game.killer2Id ?? undefined,
    mateId: game.mateId,
    mapId: game.mapId,
    gameplay: [...game.gameplay],
    ignoredSurvivors: game.ignoredSurvivors,
    mateGameplay: [...game.mateGameplay],
    deaths: survivorCount(game.mode) - game.escapes,
    survivorAbandons: game.survivorAbandons,
    killerBehavior: game.killerBehavior,
    sawEscaped: game.sawEscaped ?? false,
    hatchEscape: game.hatchEscape ?? false,
    hookSkip: game.hookSkip ?? 'none',
    bots: game.bots ?? 0,
    generatorsLeft: game.generatorsLeft,
    fun: game.fun,
    notes: game.notes ?? '',
  }
}

// What the API expects (before gameSchema checks it). `isNew`: an empty date means now.
export function draftToInput(draft: GameDraft, isNew: boolean) {
  const { deaths, playedAt, notes, ...fields } = draft
  const date = playedAt ? fromParisInput(playedAt) : isNew ? new Date() : null
  return {
    ...fields,
    escapes: survivorCount(draft.mode) - deaths,
    playedAt: date?.toISOString() ?? null,
    notes: notes.trim() || null,
  } as unknown as GameInput
}
