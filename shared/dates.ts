// Days are handled as 'YYYY-MM-DD' strings in Europe/Paris, so the server and the browser
// agree on what "today" is.
const TIME_ZONE = 'Europe/Paris'

export function todayInParis() {
  // The sv-SE locale writes dates as YYYY-MM-DD.
  return new Date().toLocaleDateString('sv-SE', { timeZone: TIME_ZONE })
}

// An event is running from its start day, until its end day if it has one.
export function isEventActive(event: { startsOn: string | null; endsOn: string | null }, today = todayInParis()) {
  return event.startsOn !== null && event.startsOn <= today && (event.endsOn === null || today <= event.endsOn)
}

// '2026-10-01' -> '1 oct. 2026'
export function formatDay(day: string) {
  // A day has no time zone: read and print it in UTC so it never shifts.
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('fr-FR', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// Date -> '2026-11-16T14:03', the wall time in Paris, as <input type="datetime-local">
// reads and writes it.
export function toParisInput(date: Date) {
  return date
    .toLocaleString('sv-SE', {
      timeZone: TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
    .replace(' ', 'T')
}

// '2026-11-16T14:03' in Paris -> Date. Starts from the same wall time in UTC and shifts
// it by Paris' offset (twice, in case the first guess lands across a DST change).
export function fromParisInput(value: string) {
  const target = new Date(`${value}:00Z`).getTime()
  let time = target
  for (let i = 0; i < 2; i++) {
    time -= new Date(`${toParisInput(new Date(time))}:00Z`).getTime() - target
  }
  return new Date(time)
}

// Date -> '16 nov. 2026, 14:03'
export function formatDateTime(date: Date | string) {
  return new Date(date).toLocaleString('fr-FR', {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
