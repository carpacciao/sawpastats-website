// Turns sheet cell values into schema values. Each parser throws on a value it doesn't know.
import type { schema } from '../../server/db/client'
import { KILLERS, MAPS, MATES } from '../reference'

type Game = typeof schema.games.$inferInsert
type GameplayTag = NonNullable<Game['gameplay']>[number]

export type Cell = string | number | null

const KILLER_ALIASES: Record<string, string> = {
  Vecna: 'Vecna D&D',
}

const MAP_ALIASES: Record<string, string> = {
  'La place dévastée, Le Borgo décimé': 'La place dévastée - Le Borgo décimé',
  'La place dévastée': 'La place dévastée - Le Borgo décimé',
  'Aire de corbeaux': 'Cimetière Abandonné - Aire de corbeaux',
  'Sables Morts': 'Sables Morts - Aire de corbeaux',
}

// Played alongside Saw in 2v8 as killer, but not a known player.
const RANDOM_MATE = 'Random Killer'

function text(value: Cell) {
  if (value === null) throw new Error('empty cell')
  return String(value).trim()
}

export function int(value: Cell, max: number) {
  const n = typeof value === 'number' ? value : Number(text(value))
  if (!Number.isInteger(n) || n < 0 || n > max) throw new Error(`expected 0–${max}, got "${value}"`)
  return n
}

export function yesNo(value: Cell) {
  const v = text(value)
  if (v === 'Oui') return true
  if (v === 'Non') return false
  throw new Error(`expected Oui/Non, got "${v}"`)
}

function lookup(value: Cell, aliases: Record<string, string>, known: { name: string; in2v8?: boolean }[], only2v8: boolean, what: string) {
  const v = text(value)
  const name = aliases[v] ?? v
  const entry = known.find((k) => k.name === name)
  if (!entry) throw new Error(`unknown ${what} "${v}"`)
  if (only2v8 && !entry.in2v8) throw new Error(`${what} "${name}" is not available in 2v8`)
  return name
}

export const killer = (value: Cell, only2v8 = false) => lookup(value, KILLER_ALIASES, KILLERS, only2v8, 'killer')
export const map = (value: Cell, only2v8 = false) => lookup(value, MAP_ALIASES, MAPS, only2v8, 'map')

export function mate(value: Cell) {
  const v = text(value)
  return v === RANDOM_MATE ? null : lookup(v, {}, MATES, false, 'mate')
}

const TAGS: Record<string, GameplayTag> = {
  tunnel: 'tunnel',
  slug: 'slug',
  camp: 'camp',
  cheater: 'cheater',
  fairplay: 'fairplay',
}
const TAG_ORDER = Object.values(TAGS)

// "Tunnel + Camp 3V1" -> tags [tunnel, camp], 1 ignored survivor. "Normal" -> no tags.
export function gameplay(value: Cell) {
  let v = text(value).toLowerCase()
  let ignoredSurvivors = 0
  const modifier = v.match(/(?:^| )([32])v1$/)
  if (modifier) {
    ignoredSurvivors = modifier[1] === '3' ? 1 : 2
    v = v.slice(0, modifier.index).trim()
  }
  if (v === '' || v === 'normal') return { gameplay: [], ignoredSurvivors }
  const tags = v.split('+').map((part) => {
    const tag = TAGS[part.trim()]
    if (!tag) throw new Error(`unknown gameplay "${value}"`)
    return tag
  })
  return { gameplay: TAG_ORDER.filter((t) => tags.includes(t)), ignoredSurvivors }
}

const BEHAVIORS: [RegExp, Game['killerBehavior']][] = [
  [/^Ragequit \+ Abandon Tueur$/, 'ragequit_abandon'],
  [/^Ragequit Tueur$/, 'ragequit'],
  [/^Abandon Tueur$/, 'abandon'],
  [/^AFK Tueur$/, 'afk'],
  [/^Fr?iendly <3$/, 'friendly'],
]

// "2" -> 2 survivor abandons. "Ragequit Tueur +1A" -> ragequit, 1 survivor abandon.
export function abandons(value: Cell, max: number) {
  if (typeof value === 'number') return { survivorAbandons: int(value, max), killerBehavior: null }
  const v = text(value)
  if (/^\d+$/.test(v)) return { survivorAbandons: int(v, max), killerBehavior: null }
  const [, base = '', count] = v.match(/^(.*?)(?: ?\+ ?(\d)A)?$/) ?? []
  const behavior = BEHAVIORS.find(([pattern]) => pattern.test(base.trim()))
  if (!behavior) throw new Error(`unknown abandons "${v}"`)
  return { survivorAbandons: count ? int(count, max) : 0, killerBehavior: behavior[1] }
}

const HOOK_SKIPS: Record<string, Game['hookSkip']> = {
  'Non': 'none',
  'P1': 'p1',
  'P1-P2': 'p1_p2',
  'P2-P3': 'p2_p3',
  'P1-P2-P3': 'p1_p2_p3',
}

export function hookSkip(value: Cell) {
  const v = text(value)
  const skip = HOOK_SKIPS[v]
  if (!skip) throw new Error(`unknown hook phase "${v}"`)
  return skip
}

const FUN: Record<string, Game['fun']> = { Oui: 'yes', Normal: 'normal', Non: 'no' }

export function fun(value: Cell) {
  if (value === null) return null
  const v = text(value)
  const f = FUN[v]
  if (!f) throw new Error(`unknown fun "${v}"`)
  return f
}

const PARTIES: Record<string, Game['party']> = {
  Solo: 'solo',
  Duo: 'duo',
  Trio: 'trio',
  Quatuor: 'quatuor',
  Quintette: 'quintette',
  Sextuor: 'sextuor',
  Septuor: 'septuor',
  Octuor: 'octuor',
  Viewers: 'viewers',
}

export function party(value: Cell) {
  const v = text(value)
  const p = PARTIES[v]
  if (!p) throw new Error(`unknown party size "${v}"`)
  return p
}
