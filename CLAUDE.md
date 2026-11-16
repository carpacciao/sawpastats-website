# sawpastats

Stats site for the streamer **Sawpalin**, who plays **Dead by Daylight (DBD)**. Everything must stay on free tiers, with no paid usage.

**The audience is French-speaking**: every text a visitor sees is written in French.

- **Showcase** (public): tables and charts of all games. Games can be played in several game modes.
- **Ingestion** (`/admin`, login required): where Sawpalin adds the stats of a game he played.
- **API**: Nuxt server routes that read and write the stats in Neon.

## Tech stack

- **Nuxt** (Vue + TypeScript): pages in `app/`, API in `server/` (Nitro).
- **Nuxt UI** (Tailwind CSS): components are prefixed with `U` (`UButton`, `UCard`, ...). Icons come from the locally installed Lucide set (`i-lucide-*`).
- **Neon** (Postgres) through **Drizzle ORM** with the `neon-http` driver.
- **Vercel** (Hobby plan): deploys from `main`, and every other branch gets a preview URL. Function region is `fra1`, next to the Neon database in `eu-central-1`.
- **pnpm**, with Node pinned by `.nvmrc` (managed with fnm) and `engines` in `package.json`.

## Commands

| Command | What it does |
|---------|--------------|
| `pnpm dev` | Dev server at http://localhost:3000 (reads `.env`). |
| `pnpm build` | Production build (what Vercel runs). |
| `pnpm preview` | Serves the production build locally. |
| `pnpm typecheck` | Type checking with `vue-tsc`. |
| `pnpm db:generate` | Writes a new SQL migration into `drizzle/` from changes to `server/db/schema.ts`. |
| `pnpm db:migrate` | Applies pending migrations to the Neon database in `.env`. |
| `pnpm db:studio` | Opens Drizzle Studio to browse the database. |
| `pnpm db:seed` | Adds the missing killers, maps, mates and events (`scripts/reference.ts`). Never overwrites existing rows. |
| `pnpm db:import-sheet <file.xlsx>` | Imports the games of the Google Sheet export. `--dry-run` only checks the file, `--replace` deletes every game first. |
| `pnpm admin:set-password <pw>` | Sets the admin password and logs out every session. |
| `pnpm admin:set-password --generate` | Same, with a random password that is printed once. |

## Structure

```
app/
  pages/          index (public), login, admin.vue (parent of every admin/ page) + admin/
  layouts/        admin.vue (sidebar), used by every /admin page
  components/     admin/Page.vue wraps each admin screen (panel + title bar),
                  admin/ReferenceTable.vue is the killers / maps / mates / events editor
  composables/    useAdminReference() (the four lists with usage counts, shared cache)
  middleware/     admin.ts (protects /admin), guest.ts (keeps logged-in visitors off /login)
shared/           imported by app/ and server/: enums.ts (enum values), labels.ts (French labels),
                  dates.ts (days in Europe/Paris, active event)
server/
  api/            routes, named <name>.<method>.ts (health.get.ts, auth/login.post.ts, ...)
                  admin/[list]/... edits killers, maps, mates, events (server/utils/reference.ts)
  db/             client.ts (useDb()), schema.ts (tables)
  utils/          auto-imported helpers: password hashing, sessions, requireAdmin()
drizzle/          generated migrations (committed, never edited by hand)
scripts/          run locally with tsx, never deployed
  reference.ts    killers, maps, mates and events, seeded by db:seed and the import
  import-sheet/   one-off import of the existing Google Sheet stats
```

## Auth

- **One shared admin account**: there are no usernames and no sign-up. The `admin` table always has exactly one row, holding the password hash (scrypt, from Node's `crypto`).
- **Sessions**: the `sessions` table stores only a SHA-256 hash of each token. The `sid` cookie is `HttpOnly`, `SameSite=Lax` and `Secure` in production, and lasts 30 days.
- **Protecting a route**: every admin-only API route must call `await requireAdmin(event)`. The page guards in `app/middleware/` only control which screen is shown; they don't protect data.
- **No public links**: the homepage must not link to `/login` or `/admin`.
- **Brute force**: a random password can't be guessed, so the risk is quota, not access. Each login attempt costs a Vercel function call, a deliberately slow scrypt check and one Neon query. Failed attempts write nothing to the database. Going over the free quota pauses Vercel or suspends Neon until the next cycle; it never costs money. Login rate limiting belongs in Vercel's Firewall (a rate-limit rule on `/api/auth/login`), not in app code: functions don't share memory, and a counter in Neon would add a query per attempt.

## Conventions

- **Language**:
  - Interface in French: page text, titles, labels, error messages.
  - `<html lang="fr">` is set in `nuxt.config.ts`, and Nuxt UI uses its `fr` locale (`<UApp :locale="fr">` in `app/app.vue`).
  - Dates and times use `fr-FR` with an explicit time zone (`Europe/Paris`), so the server and the browser render the same text.
  - Code, comments, commit messages and API error messages stay in English.
- Database changes: edit `server/db/schema.ts`, run `pnpm db:generate`, then `pnpm db:migrate`. Migrations run from a local machine, never during the Vercel build.
- Server code imports the database with relative paths (`../db/client`), so the files in `scripts/` can import it too.
- TypeScript stays on 5.x, because `vue-tsc` can't run on TypeScript 7 yet.
- Secrets live only in `.env` (gitignored) and in Vercel environment variables. `.env.example` lists the names.
- Commits use Conventional Commits. **A `chore:` commit does not deploy** (`ignoreCommand` in `vercel.json` checks the latest commit's title). Use `chore` only for changes that don't affect the build (docs, CLAUDE.md, ...). Dependency updates go under `build:` or `fix:`. Vercel only looks at the last commit of a push, so push a `chore` on its own or before the real change.

## Environment variables

- `DATABASE_URL`: the Neon Postgres connection string. Set it in `.env` locally and in the Vercel project settings (Production and Preview).
