# Verdict

AI-assisted Amazon affiliate review site built with Next.js, PostgreSQL, and Auth.js. Review drafts are generated in-app with OpenAI.

## Quick start (local)

1. Install [PostgreSQL](https://www.postgresql.org/download/) and copy env file:
   ```powershell
   cp .env.example .env.local
   ```
2. Set `POSTGRES_ADMIN_URL` in `.env.local` (your local `postgres` superuser password).
3. Create the database and seed sample data:
   ```powershell
   npm install
   powershell -ExecutionPolicy Bypass -File scripts/setup-local-db.ps1
   ```
   Or manually: `npm run db:setup`
4. Start the dev server:
   ```powershell
   npm run dev
   ```
5. Open http://localhost:3000 and sign in at `/login` with `ADMIN_EMAIL` / `ADMIN_INITIAL_PASSWORD` from `.env.local`.

See **DEPLOYMENT.md** for Coolify/VPS production deployment.

## Generating reviews

Set `OPENAI_API_KEY` in `.env.local`, then go to `/dashboard/new-review`. Submitting a product generates a draft review with AI, fetches the product image from Amazon, and saves it unpublished for you to review and publish. Public suggestions from `/suggest` land in `/dashboard/review-requests`, where **Process** generates a draft the same way.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm run db:create` | Create local Postgres user/database |
| `npm run db:migrate` | Apply schema migrations |
| `npm run db:seed` | Seed categories, sample posts, admin user |
| `npm run db:setup` | Run create + migrate + seed |

## Stack

- **Frontend:** Next.js 15 App Router, Tailwind, shadcn/ui
- **Database:** PostgreSQL + Drizzle ORM
- **Auth:** Auth.js (admin credentials)
- **AI:** OpenAI (in-app review generation + editor assist)
