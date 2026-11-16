// French labels for the enum values, used by the admin and the showcase.
import type { Fun, GameMode, GameplayTag, HookSkip, KillerBehavior, PartySize } from './enums'

export const GAME_MODE_LABELS: Record<GameMode, string> = {
  '1v4': '1v4',
  '2v8_survivor': '2v8 survivant',
  '2v8_killer': '2v8 tueur',
}

export const PARTY_SIZE_LABELS: Record<PartySize, string> = {
  solo: 'Solo',
  duo: 'Duo',
  trio: 'Trio',
  quatuor: 'Quatuor',
  quintette: 'Quintette',
  sextuor: 'Sextuor',
  septuor: 'Septuor',
  octuor: 'Octuor',
  viewers: 'Viewers',
}

export const GAMEPLAY_TAG_LABELS: Record<GameplayTag, string> = {
  tunnel: 'Tunnel',
  slug: 'Slug',
  camp: 'Camp',
  cheater: 'Cheater',
  fairplay: 'Fairplay',
}

// Shown when a game has no gameplay tag.
export const NORMAL_GAMEPLAY_LABEL = 'Normal'

// 1v4 only: how many survivors the killer ignored.
export const IGNORED_SURVIVORS_LABELS: Record<number, string> = {
  0: 'Aucun',
  1: '3v1',
  2: '2v1',
}

export const KILLER_BEHAVIOR_LABELS: Record<KillerBehavior, string> = {
  ragequit: 'Ragequit',
  abandon: 'Abandon',
  afk: 'AFK',
  friendly: 'Friendly <3',
  ragequit_abandon: 'Ragequit + abandon',
}

// Shown when a game has no killer behavior.
export const NO_KILLER_BEHAVIOR_LABEL = 'Aucun'

export const HOOK_SKIP_LABELS: Record<HookSkip, string> = {
  none: 'Aucune',
  p1: 'P1',
  p1_p2: 'P1-P2',
  p2_p3: 'P2-P3',
  p1_p2_p3: 'P1-P2-P3',
}

export const FUN_LABELS: Record<Fun, string> = {
  yes: 'Oui',
  normal: 'Normal',
  no: 'Non',
}
