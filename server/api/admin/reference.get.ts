import { useDb } from '../../db/client'

// Every killer, map, mate and event, with how many games use each one.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const [killers, maps, mates, events] = await useDb().batch([
    selectWithUsage('killers'),
    selectWithUsage('maps'),
    selectWithUsage('mates'),
    selectWithUsage('events'),
  ])

  return { killers, maps, mates, events }
})
