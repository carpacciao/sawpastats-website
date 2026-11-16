// Enum values shared by the database schema, the API and the app.
// What each value means is documented next to its pgEnum in server/db/schema.ts.

export const GAME_MODES = ['1v4', '2v8_survivor', '2v8_killer'] as const

export const PARTY_SIZES = [
  'solo',
  'duo',
  'trio',
  'quatuor',
  'quintette',
  'sextuor',
  'septuor',
  'octuor',
  'viewers',
] as const

export const GAMEPLAY_TAGS = ['tunnel', 'slug', 'camp', 'cheater', 'fairplay'] as const

export const KILLER_BEHAVIORS = ['ragequit', 'abandon', 'afk', 'friendly', 'ragequit_abandon'] as const

export const HOOK_SKIPS = ['none', 'p1', 'p1_p2', 'p2_p3', 'p1_p2_p3'] as const

export const FUN = ['yes', 'normal', 'no'] as const

export type GameMode = (typeof GAME_MODES)[number]
export type PartySize = (typeof PARTY_SIZES)[number]
export type GameplayTag = (typeof GAMEPLAY_TAGS)[number]
export type KillerBehavior = (typeof KILLER_BEHAVIORS)[number]
export type HookSkip = (typeof HOOK_SKIPS)[number]
export type Fun = (typeof FUN)[number]
