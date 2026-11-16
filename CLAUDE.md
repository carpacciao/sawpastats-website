# sawpastats

Stats site for the streamer **Sawpalin**, who plays **Dead by Daylight (DBD)**. Everything must stay on free tiers, with no paid usage.

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
| `pnpm admin:set-password <pw>` | Sets the admin password and logs out every session. |
| `pnpm admin:set-password --generate` | Same, with a random password that is printed once. |

## Structure

```
app/
  pages/          index (public), login, admin
  middleware/     admin.ts (protects /admin), guest.ts (keeps logged-in visitors off /login)
server/
  api/            routes, named <name>.<method>.ts (health.get.ts, auth/login.post.ts, ...)
  db/             client.ts (useDb()), schema.ts (tables)
  utils/          auto-imported helpers: password hashing, sessions, requireAdmin()
drizzle/          generated migrations (committed, never edited by hand)
scripts/          run locally with tsx, never deployed
  import-sheet/   reserved for importing the existing Google Sheet stats
```

## Auth

- **One shared admin account**: there are no usernames and no sign-up. The `admin` table always has exactly one row, holding the password hash (scrypt, from Node's `crypto`).
- **Sessions**: the `sessions` table stores only a SHA-256 hash of each token. The `sid` cookie is `HttpOnly`, `SameSite=Lax` and `Secure` in production, and lasts 30 days.
- **Protecting a route**: every admin-only API route must call `await requireAdmin(event)`. The page guards in `app/middleware/` only control which screen is shown; they don't protect data.
- **No public links**: the homepage must not link to `/login` or `/admin`.

## Conventions

- Database changes: edit `server/db/schema.ts`, run `pnpm db:generate`, then `pnpm db:migrate`. Migrations run from a local machine, never during the Vercel build.
- Server code imports the database with relative paths (`../db/client`), so the files in `scripts/` can import it too.
- TypeScript stays on 5.x, because `vue-tsc` can't run on TypeScript 7 yet.
- Secrets live only in `.env` (gitignored) and in Vercel environment variables. `.env.example` lists the names.
- Commits use Conventional Commits. **A `chore:` commit does not deploy** (`ignoreCommand` in `vercel.json` checks the latest commit's title). Use `chore` only for changes that don't affect the build (docs, CLAUDE.md, ...). Dependency updates go under `build:` or `fix:`. Vercel only looks at the last commit of a push, so push a `chore` on its own or before the real change.

## Environment variables

- `DATABASE_URL`: the Neon Postgres connection string. Set it in `.env` locally and in the Vercel project settings (Production and Preview).
