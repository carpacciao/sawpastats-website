import { schema, useDb } from '../../db/client'

type WithUsage<T> = (T & { games: number })[]

// Every killer, map, mate and event, with how many games use each one.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const [killers, maps, mates, events] = await useDb().batch([
    selectWithUsage('killers'),
    selectWithUsage('maps'),
    selectWithUsage('mates'),
    selectWithUsage('events'),
  ])

  // selectWithUsage() is generic over the four tables, so each result is typed here.
  return { killers, maps, mates, events } as unknown as {
    killers: WithUsage<typeof schema.killers.$inferSelect>
    maps: WithUsage<typeof schema.maps.$inferSelect>
    mates: WithUsage<typeof schema.mates.$inferSelect>
    events: WithUsage<typeof schema.events.$inferSelect>
  }
})
