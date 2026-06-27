# Deploying ReviewMax (VPS + Coolify + PostgreSQL)

This guide assumes a VPS with [Coolify](https://coolify.io) and a PostgreSQL database.

## 1. PostgreSQL

### Local development (native PostgreSQL on Windows)

1. Install PostgreSQL from [postgresql.org](https://www.postgresql.org/download/windows/) if needed.
2. Copy env file and set your **postgres superuser password**:
   ```powershell
   cp .env.example .env.local
   ```
   Edit `.env.local` → replace `YOUR_POSTGRES_PASSWORD` in `POSTGRES_ADMIN_URL`.
3. Create database, migrate, and seed:
   ```powershell
   npm run db:setup
   npm run dev
   ```
4. Sign in at `/login` with `ADMIN_EMAIL` / `ADMIN_INITIAL_PASSWORD`.

### Production (Coolify)

1. In Coolify, create a **PostgreSQL** service in the same project as the app.
2. Copy the internal connection string into the app env as `DATABASE_URL`.
3. On first deploy, run migrations and seed from the app container or a one-off command:
   - `npm run db:migrate`
   - `npm run db:seed` (requires `ADMIN_INITIAL_PASSWORD`)

## 2. Environment variables

Add every variable from `.env.example` to Coolify:

| Variable | Notes |
|----------|-------|
| `DATABASE_URL` | Internal Postgres URL from Coolify |
| `AUTH_SECRET` | Long random string (`openssl rand -base64 32`) |
| `AUTH_URL` | Public site URL, e.g. `https://reviews.yourdomain.com` |
| `ADMIN_EMAIL` | Seeded admin login email |
| `ADMIN_INITIAL_PASSWORD` | One-time seed password; rotate after first login |
| `OPENAI_API_KEY` | Required for in-app review generation and editor assist |
| `NEXT_PUBLIC_SITE_URL` | Same as public URL |

Server-only (never expose to browser): `DATABASE_URL`, `AUTH_SECRET`, `OPENAI_API_KEY`, `SENTRY_DSN`.

## 3. Deploy to Coolify

1. Push this repo to GitHub.
2. Create a **Next.js** application in Coolify and connect the repo.
3. Set build/start commands (Coolify defaults usually work):
   - Build: `npm run build`
   - Start: `npm run start` (uses Next.js standalone output)
4. Paste environment variables.
5. Attach your domain in Coolify (HTTPS handled by the reverse proxy).

### Coolify build fails at “Linting and checking validity of types” (exit 255)

If the log shows `✓ Compiled successfully` then fails **immediately** on the next line with **no TypeScript error**, the build container was almost certainly **stopped** (timeout or out-of-memory), not rejected by the compiler.

1. **Increase build timeout** in Coolify (application → Advanced / Build → timeout) to **at least 600s (10 minutes)**. A full Next.js + Sentry build often needs **3–6 minutes** before typecheck finishes.
2. Ensure the server has **≥ 6 GB RAM** free during builds (Dockerfile sets `max-old-space-size=4096` for Node).
3. Click **Show Debug Logs** and look for `Killed`, `ENOMEM`, or `timeout`.
4. Run `npm run lint` and `npm run build` locally before pushing; the Dockerfile uses `next build --no-lint` to shorten Coolify builds.

After the first deploy:

```bash
npm run db:migrate
npm run db:seed
```

Re-run `npm run db:migrate` after pulling updates that add SQL files under `drizzle/` (e.g. `0001_post_gallery.sql`). Uses `DATABASE_URL` from Coolify env (no `.env.local` in production).

## 4. Review generation

Reviews are generated in-app — no external automation service is required.

1. Set `OPENAI_API_KEY` in the app environment.
2. Sign in and go to `/dashboard/new-review`.
3. Submitting a product calls OpenAI to draft the review, fetches the product image from Amazon, and saves an **unpublished** post.
4. Review and publish the draft from `/dashboard/posts`.

Public suggestions from `/suggest` appear in `/dashboard/review-requests`; **Process** generates a draft the same way.

## 5. Post-deploy checklist

- [ ] Open `/` and `/blog`; confirm posts load from PostgreSQL.
- [ ] Sign in at `/login` as admin; open `/dashboard` and submit a test review request.
- [ ] Confirm the generated draft appears in `/dashboard/posts`, then publish it and verify `/blog/<slug>` works.
- [ ] Confirm Amazon links include `tag=` when `NEXT_PUBLIC_AMAZON_TRACKING_ID` is set.
- [ ] Fetch `https://YOUR_DOMAIN/sitemap.xml` and `https://YOUR_DOMAIN/robots.txt`.

## 6. Custom domain (optional)

In Coolify → **Domains**, connect your domain and set `NEXT_PUBLIC_SITE_URL` and `AUTH_URL` to match.
