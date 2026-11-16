// Reads the game tabs of the Google Sheet export into games named by killer, map, ...
import ExcelJS from 'exceljs'
import type { schema } from '../../server/db/client'
import * as parse from './normalize'
import type { Cell } from './normalize'

export type Game = typeof schema.games.$inferInsert
type Mode = Game['mode']

// A game with names instead of ids, resolved once the reference data is seeded.
export type ParsedGame = Omit<Game, 'mapId' | 'killerId' | 'killer2Id' | 'mateId' | 'eventId'> & {
  map: string
  killer: string
  killer2: string | null
  mate: string | null
  event: string | null
}

type Tab = { mode: Mode; party?: Game['party']; event?: string }

const TABS: Record<string, Tab> = {
  'Solo': { mode: '1v4', party: 'solo' },
  'Duo': { mode: '1v4', party: 'duo' },
  'Trio': { mode: '1v4', party: 'trio' },
  'A Quatre': { mode: '1v4', party: 'quatuor' },
  'Viewers': { mode: '1v4', party: 'viewers' },
  'Chaos Shuffle': { mode: '1v4', event: 'Chaos Shuffle' },
  'Light Out': { mode: '1v4', party: 'solo', event: 'Lights Out' },
  'Event Noël 2024': { mode: '1v4', event: 'Noël 2024' },
  'Twisted Masquerade 2025': { mode: '1v4', event: 'Twisted Masquerade 2025' },
  'Lune de Sang 2025': { mode: '1v4', event: 'Lune de Sang 2025' },
  'Event Halloween 2025': { mode: '1v4', event: 'Halloween 2025' },
  'Event Noël 2025': { mode: '1v4', event: 'Noël 2025' },
  'Sombre Banquet 2026': { mode: '1v4', event: 'Sombre Banquet 2026' },
  'Lune de Sang 2026': { mode: '1v4', event: 'Lune de Sang 2026' },
  '2V8': { mode: '2v8_survivor' },
  '2V8 Tueur': { mode: '2v8_killer' },
}

// Computed tabs and the empty template.
const isIgnoredTab = (name: string) => name.startsWith('Stats') || name.endsWith('- Stats') || name === 'Vierge'

// Columns that may be empty. Games without a map are skipped.
const PARTY = 'Solo / Duo / Trio / Quatuor'
const OPTIONAL_COLUMNS = ['Fun', 'Royaumes', PARTY]

const HEADER_ROW = 2

function cellValue(value: ExcelJS.CellValue): Cell {
  if (value === null || value === undefined) return null
  if (typeof value === 'number' || typeof value === 'string') return value === '' ? null : value
  // exceljs leaves out a formula's cached result when it is 0.
  if (typeof value === 'object' && ('formula' in value || 'sharedFormula' in value)) {
    return cellValue((value.result ?? 0) as ExcelJS.CellValue)
  }
  if (typeof value === 'object' && 'richText' in value) return value.richText.map((r) => r.text).join('')
  return String(value)
}

// "Sorties Saw : " -> "Sorties Saw", "Nbr Mate ? " -> "Nbr Mate"
const headerKey = (header: Cell) => String(header ?? '').replace(/[:?]/g, '').trim()

function parseRow(tab: Tab, get: (header: string) => Cell): { game: ParsedGame; survivors: number; deaths: number } {
  const is2v8 = tab.mode !== '1v4'
  const survivors = is2v8 ? 8 : 4
  const base = {
    mode: tab.mode,
    event: tab.event ?? null,
    map: parse.map(get('Royaumes'), is2v8),
    generatorsLeft: parse.int(get('Géné Restants'), is2v8 ? 8 : 5),
    escapes: parse.int(get('Sorties'), survivors),
    fun: parse.fun(get('Fun')),
  }

  if (tab.mode === '2v8_killer') {
    const saw = parse.gameplay(get('Gameplay de Saw'))
    const mate = parse.gameplay(get('Gameplay du Mate'))
    if (saw.ignoredSurvivors || mate.ignoredSurvivors) throw new Error('3v1/2v1 only exists in 1v4')
    return {
      survivors,
      deaths: parse.int(get('Tués'), survivors),
      game: {
        ...base,
        killer: parse.killer(get('Tueur de Saw'), true),
        killer2: parse.killer(get('Tueur du Mate'), true),
        mate: parse.mate(get('Mate')),
        gameplay: saw.gameplay,
        mateGameplay: mate.gameplay,
        survivorAbandons: parse.int(get('Abandons Surv'), survivors),
        bots: parse.int(get('Nbr de Bots'), 8),
      },
    }
  }

  const { gameplay, ignoredSurvivors } = parse.gameplay(get('Gameplay'))
  if (gameplay.includes('fairplay')) throw new Error('Fairplay only exists when Saw is the killer')
  if (is2v8 && ignoredSurvivors) throw new Error('3v1/2v1 only exists in 1v4')
  const survivorFields = {
    ...base,
    gameplay,
    ignoredSurvivors,
    ...parse.abandons(get('Abandons'), survivors),
    sawEscaped: parse.yesNo(get('Sorties Saw')),
    hatchEscape: parse.yesNo(get('Trappe')),
    hookSkip: parse.hookSkip(get('Passage Phase Hook')),
  }
  const deaths = parse.int(get('Morts'), survivors)

  if (tab.mode === '2v8_survivor') {
    return {
      survivors,
      deaths,
      game: {
        ...survivorFields,
        killer: parse.killer(get('Tueur 1'), true),
        killer2: parse.killer(get('Tueur 2'), true),
        mate: null,
        party: parse.party(get('Nbr Mate')),
        bots: parse.int(get('Nombre de Bots'), 8),
      },
    }
  }

  return {
    survivors,
    deaths,
    game: {
      ...survivorFields,
      killer: parse.killer(get('Les Tueurs')),
      killer2: null,
      mate: null,
      // A few early event games have no party size; most games are played solo.
      party: tab.party ?? parse.party(get(PARTY) ?? 'Solo'),
    },
  }
}

export async function readWorkbook(path: string) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(path)

  const games: ParsedGame[] = []
  const errors: string[] = []
  const warnings: string[] = []
  const skipped: string[] = []

  for (const sheet of workbook.worksheets) {
    const tab = TABS[sheet.name]
    if (!tab) {
      if (!isIgnoredTab(sheet.name)) errors.push(`${sheet.name}: unknown tab, add it to TABS or ignore it`)
      continue
    }

    const columns = new Map<string, number>()
    sheet.getRow(HEADER_ROW).eachCell((cell, col) => {
      const key = headerKey(cellValue(cell.value))
      if (key && !columns.has(key)) columns.set(key, col)
    })

    let tabCount = 0
    for (let r = HEADER_ROW + 1; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r)
      if (cellValue(row.getCell(1).value) === null) continue
      const get = (header: string) => {
        const col = columns.get(header)
        if (!col) throw new Error(`missing column "${header}"`)
        const value = cellValue(row.getCell(col).value)
        if (value === null && !OPTIONAL_COLUMNS.includes(header)) throw new Error(`"${header}" is empty`)
        return value
      }
      try {
        if (get('Royaumes') === null) {
          skipped.push(`${sheet.name} row ${r}: no map`)
          continue
        }
        const { game, survivors, deaths } = parseRow(tab, get)
        if (tab.mode === '1v4' && !tab.party && columns.has(PARTY) && get(PARTY) === null) {
          warnings.push(`${sheet.name} row ${r}: no party size, imported as Solo`)
        }
        if (deaths + game.escapes !== survivors) {
          warnings.push(`${sheet.name} row ${r}: ${deaths} deaths + ${game.escapes} escapes ≠ ${survivors}, keeping the escapes`)
        }
        games.push(game)
        tabCount++
      } catch (error) {
        errors.push(`${sheet.name} row ${r}: ${(error as Error).message}`)
      }
    }
    console.log(`${sheet.name}: ${tabCount} games`)
  }

  for (const name of Object.keys(TABS)) {
    if (!workbook.getWorksheet(name)) errors.push(`${name}: tab not found in the file`)
  }

  return { games, errors, warnings, skipped }
}

type Ids = Record<'killers' | 'maps' | 'mates' | 'events', Map<string, number>>

// Replaces the names with the ids of the reference rows.
export function toRows(games: ParsedGame[], ids: Ids): Game[] {
  const id = (lookup: Map<string, number>, name: string) => {
    const found = lookup.get(name)
    if (found === undefined) throw new Error(`"${name}" is missing from the database`)
    return found
  }
  return games.map(({ map, killer, killer2, mate, event, ...game }) => ({
    ...game,
    mapId: id(ids.maps, map),
    killerId: id(ids.killers, killer),
    killer2Id: killer2 === null ? null : id(ids.killers, killer2),
    mateId: mate === null ? null : id(ids.mates, mate),
    eventId: event === null ? null : id(ids.events, event),
  }))
}
