# Verdict Project Status / Return Handoff

_Last updated: 2026-08-14 02:18 UTC_

This file records where the project was paused so Louie can safely resume later.

## Current repo state

- Project: Verdict / `reviewmax2`
- Production site: <https://verdict.maplehub.cloud>
- Branch: `main`
- Latest pushed commit at pause: `d6662b284ab2fbb28eae24470a2602b890121190`
- Latest short commit: `d6662b2 feat: paginate admin posts`
- Production deploy target: Coolify from GitHub `main`
- Runtime: Next.js standalone Docker runtime

## Recently shipped work

### Pinterest publishing pipeline

The Pinterest integration now supports:

- First-publish auto-posting for newly published reviews.
- Admin toast feedback for Pinterest success, skipped, and failed states.
- Generated pin image upload as `image_base64` so Pinterest does not need to fetch temporary image URLs.
- Pinterest SEO payload improvements:
  - keyword-rich title/description
  - alt text
  - default board fallback
  - optional outdoor/topic board routing via env vars
- Pinterest publish result logging in `pinterest_post_logs`.
- Admin Pinterest status column showing pinned/skipped/failed and `View pin` when available.
- 24-hour auto-post throttle after Pinterest spam/link-trust 429 blocks.
- Manual `Pin` button in admin posts for deliberate retries.

Relevant commits:

- `8b156ea fix: surface Pinterest posting result`
- `5c0c2e1 fix: show Pinterest result in publish toast`
- `162364a fix: guard publish action response`
- `0b50e2d fix: send Pinterest pin image as base64`
- `df485af feat: improve Pinterest SEO signals`
- `8e2ab79 feat: log Pinterest publish results`
- `05136d0 fix: allow Docker build without database url`
- `bf169dc feat: throttle Pinterest spam blocks`

### Admin posts management

- `/dashboard/posts` now has server-side pagination.
- Page-size options are `10`, `20`, `30`, and `50`.
- Pagination state is URL-backed with `page` and `perPage` query params.
- Bulk selection applies to the visible page only.

Relevant commit:

- `d6662b2 feat: paginate admin posts`

### Build/deployment compatibility

- Local `npm run build` now completes without a real local `DATABASE_URL` by allowing build-time DB module imports.
- Runtime still requires a real production `DATABASE_URL`.
- Local build may still log DB fallback query warnings during static generation; this is expected locally and does not fail the build.

Relevant commit:

- `05136d0 fix: allow Docker build without database url`

## Verification at pause

Last verification performed before pausing:

```bash
npm run test -- tests/admin-posts-pagination.test.ts
npm run lint
npx tsc --noEmit
npm run build
curl -sS -i https://verdict.maplehub.cloud/api/health
```

Results:

- Tests passed: `102 passed, 0 failed`
- Lint passed with the existing warning in `app/pin-template/PinTemplate.tsx` about using `<img>` instead of Next `<Image />`.
- TypeScript passed.
- Production build passed.
- Production health endpoint returned OK.

## Production/database handoff

A database migration was added for Pinterest logging:

```text
drizzle/0009_pinterest_post_logs.sql
```

If it has not already been run in production, run this once after a successful Coolify deploy:

```bash
npm run db:migrate
```

Run it inside the app container so it uses Coolify's production `DATABASE_URL`.

No additional migration is required for the admin pagination change.

## Pinterest status and caution

Pinterest recently returned:

```text
Pinterest 429: {"code":9,"message":"Sorry! We blocked this link because it may lead to spam.","details":{"source_field":null}}
```

Interpretation:

- This does **not** necessarily mean the whole Pinterest account is blocked.
- It means Pinterest blocked that submitted link/domain/pin attempt as spam-risk.
- Causes may include new domain trust, repeated similar posts, affiliate/review-site signals, or posting too quickly during testing.

Current safety behavior:

- Auto-posting pauses for 24 hours after this spam/link-trust block.
- Reviews still publish normally.
- Admin can retry manually with the `Pin` button, but manual retries can still get 429 if Pinterest has not cooled down.

Recommended Pinterest warm-up:

1. Wait 24–48 hours before another Pinterest retry.
2. Retry only one post manually from `/dashboard/posts`.
3. If it succeeds, resume slowly.
4. If it fails with 429 again, pause longer and focus on Pinterest domain/account trust:
   - claim/verify the site if possible
   - enable/validate Rich Pins if available
   - complete Pinterest profile and board descriptions
   - manually save a few Verdict links over several days

## Coolify environment variables to confirm

Do not paste secrets into chat or docs. Values below intentionally omit secrets.

Required/expected:

```env
DATABASE_URL=[REDACTED]
AUTH_SECRET=[REDACTED]
AUTH_URL=https://verdict.maplehub.cloud
NEXT_PUBLIC_SITE_URL=https://verdict.maplehub.cloud
PINTEREST_ACCESS_TOKEN=[REDACTED]
PINTEREST_DEFAULT_BOARD_ID=626211591877797535
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
CHROMIUM_PATH=/usr/bin/chromium-browser
```

Optional Pinterest board routing vars:

```env
PINTEREST_BOARD_CAMPING=
PINTEREST_BOARD_HIKING=
PINTEREST_BOARD_FISHING=
PINTEREST_BOARD_CYCLING=
PINTEREST_BOARD_WATER=
PINTEREST_BOARD_OUTDOOR_APPAREL=
PINTEREST_BOARD_HOME_TOOLS=
```

Cron endpoints should remain protected with Bearer `$CRON_SECRET`.

## Next work when returning

Recommended order:

1. **Confirm deployment state**
   - Check latest deployed commit in Coolify.
   - Confirm production health: <https://verdict.maplehub.cloud/api/health>

2. **Run/confirm DB migration**
   - If `0009_pinterest_post_logs.sql` has not been applied, run:
     ```bash
     npm run db:migrate
     ```

3. **Verify admin posts page**
   - Open `/dashboard/posts`.
   - Test page sizes `10`, `20`, `30`, `50`.
   - Test Previous/Next.
   - Confirm Live, Edit, Delete, and Pin actions still work on paginated pages.

4. **Verify Pinterest logging/UI**
   - Confirm the Pinterest column shows latest status per post.
   - Confirm successful pins show `View pin`.
   - Confirm failures/skips display useful messages.

5. **Pinterest recovery test**
   - Wait 24–48 hours from the latest 429 before retrying.
   - Manually pin one published post only.
   - If successful, slowly resume automated publish/pin workflow.
   - If 429 persists, pause automation and improve Pinterest/domain trust first.

6. **Documentation cleanup**
   - Update `README.md` and `DEPLOYMENT.md` to reflect current Pinterest behavior, manual Pin, admin pagination, and migration requirements.
   - Decide whether to keep/commit or remove currently untracked documentation folders before the next shipped commit.

## Known local working tree note

At pause time, there are untracked documentation/context files in the working tree, including:

```text
.hermes.md
.hermes/
docs/
```

They were not part of the latest shipped code commits. Review them before adding them to Git so unrelated docs do not get committed accidentally.
