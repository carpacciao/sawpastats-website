import { formatDateTime, todayInParis } from '../../../../shared/dates'
import { survivorCount } from '../../../../shared/game'
import {
  FUN_LABELS,
  GAME_MODE_LABELS,
  GAMEPLAY_TAG_LABELS,
  HOOK_SKIP_LABELS,
  IGNORED_SURVIVORS_LABELS,
  KILLER_BEHAVIOR_LABELS,
  NORMAL_GAMEPLAY_LABEL,
  PARTY_SIZE_LABELS,
} from '../../../../shared/labels'

type Game = GameWithNames
type Cell = string | number | null | undefined

function yesNo(value: boolean | null) {
  return value === null ? '' : value ? 'Oui' : 'Non'
}

function gameplay(tags: Game['gameplay']) {
  return tags.length ? tags.map((tag) => GAMEPLAY_TAG_LABELS[tag]).join(' + ') : NORMAL_GAMEPLAY_LABEL
}

// French headers and values, as Sawpalin reads them on the site.
const COLUMNS: [string, (game: Game) => Cell][] = [
  ['N°', (g) => g.id],
  ['Date', (g) => g.playedAt && formatDateTime(g.playedAt)],
  ['Mode', (g) => GAME_MODE_LABELS[g.mode]],
  ['Événement', (g) => g.event],
  ['Groupe', (g) => g.party && PARTY_SIZE_LABELS[g.party]],
  ['Tueur', (g) => g.killer],
  ['Tueur 2', (g) => g.killer2],
  ['Mate', (g) => (g.mode === '2v8_killer' ? (g.mate ?? 'Random') : '')],
  ['Carte', (g) => g.map],
  ['Gameplay', (g) => gameplay(g.gameplay)],
  ['Survivants ignorés', (g) => (g.mode === '1v4' ? IGNORED_SURVIVORS_LABELS[g.ignoredSurvivors] : '')],
  ['Gameplay du mate', (g) => (g.mode === '2v8_killer' ? gameplay(g.mateGameplay) : '')],
  ['Morts', (g) => survivorCount(g.mode) - g.escapes],
  ['Sorties', (g) => g.escapes],
  ['Abandons', (g) => g.survivorAbandons],
  ['Comportement du tueur', (g) => g.killerBehavior && KILLER_BEHAVIOR_LABELS[g.killerBehavior]],
  ['Saw sorti', (g) => yesNo(g.sawEscaped)],
  ['Trappe', (g) => yesNo(g.hatchEscape)],
  ['Phases de hook sautées', (g) => g.hookSkip && HOOK_SKIP_LABELS[g.hookSkip]],
  ['Bots', (g) => g.bots],
  ['Générateurs restants', (g) => g.generatorsLeft],
  ['Fun', (g) => g.fun && FUN_LABELS[g.fun]],
  ['Notes', (g) => g.notes],
]

// Semicolons, because French Excel reads ";" as the separator.
function csvCell(value: Cell) {
  const text = value === null || value === undefined ? '' : String(value)
  return /[";\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

// Every game matching the list's filters, as a CSV file.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const filters = readGameFilters(event)

  const games = (await selectGamesWithNames()
    .where(gameFilterWhere(filters))
    .orderBy(...GAME_ORDER)) as GameWithNames[]

  const lines = [
    COLUMNS.map(([header]) => csvCell(header)).join(';'),
    ...games.map((game) => COLUMNS.map(([, value]) => csvCell(value(game))).join(';')),
  ]

  setResponseHeaders(event, {
    'content-type': 'text/csv; charset=utf-8',
    'content-disposition': `attachment; filename="sawpastats-parties-${todayInParis()}.csv"`,
  })
  // The BOM tells Excel the file is UTF-8, so the accents show.
  return `﻿${lines.join('\r\n')}\r\n`
})
