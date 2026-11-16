// Adds the missing killers, maps, mates and events. Safe to run again.
// Usage: pnpm db:seed
import { seedReference } from './reference'

await seedReference()
console.log('Reference data seeded.')
