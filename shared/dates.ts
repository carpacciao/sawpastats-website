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
