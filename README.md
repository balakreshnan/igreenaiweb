# igreen.ai

A Material Design 3-inspired sustainability community built with Next.js. People, businesses, and enterprise teams can create private profiles, log or schedule practical actions, bulk upload activity from Excel, follow their progress, and download their own activity as CSV.

## User documentation

See the [igreen.ai User Guide](docs/USER_GUIDE.md) for step-by-step account creation, sign-in, dashboard use, activity logging, recurring schedules, Excel uploads, CSV exports, and troubleshooting.

## What is included

- Mission-led responsive landing page with individual, business, and enterprise pathways
- Homepage introduction video and an interactive How to learning center with seven guided tutorials
- Private account registration and sign-in with scrypt password hashing
- Signed, HTTP-only, same-site session cookies
- Personal impact dashboard, milestones, category summaries, activity history, and CSV export
- Daily, weekly, and monthly activity schedules with automatic due-date processing
- Guided Excel template and authenticated bulk upload for up to 500 activities at a time
- Database-backed duplicate prevention across manual, scheduled, and uploaded activities
- Protected administrator console for registration and community activity oversight
- Persistent Neon Postgres storage for member profiles, impact activity, and goal assessments
- Relational records with unique member email addresses and cascading cleanup of member-owned data

## Run locally

```bash
pnpm install
pnpm dev
```

Copy `.env.example` to `.env.local` and add development secrets if you need to test administrator access. `.env*` files are ignored by Git.

Apply the database schema once to a new Neon database. The command is idempotent and preserves existing rows:

```bash
pnpm db:schema
```

## Deploy securely on Vercel

1. Import the repository into Vercel and open the active project's **Settings → Environment Variables** page.
2. Add `DATABASE_URL` using the pooled Neon connection string. Its hostname normally contains `-pooler`.
3. Add these server-only Environment Variables for Production, Preview, and Development as appropriate:
   - `DATABASE_URL`: the pooled Neon runtime connection
   - `SESSION_SECRET`: a random value of at least 32 bytes
   - `CRON_SECRET`: a random value of at least 16 characters used to secure scheduled processing
   - `ADMIN_USERNAME`: the requested administrator username
   - `ADMIN_PASSWORD`: the requested administrator password
4. In the Neon console, open **SQL Editor**, paste the contents of `database/schema.sql`, and select **Run**. Alternatively, add `DATABASE_URL_UNPOOLED` locally and run `pnpm db:schema`.
5. Redeploy after adding or changing environment variables. Environment changes do not modify existing deployments.

The schema uses additive and idempotent statements; applying it again does not delete or replace registrations. Deployments only connect to the existing database and do not initialize, truncate, or overwrite member data. Consider using a separate Neon branch for Vercel Preview deployments so testing cannot add records to Production.

The production deployment registers `/api/cron/schedules` from `vercel.json` and runs it daily at 05:00 UTC. Vercel sends `CRON_SECRET` as a bearer authorization header. Members also trigger a safe reconciliation when they sign in or open their dashboard, so a delayed cron does not lose due activities.

The application uses these tables:

- `community_users`: account profile, password hash and salt, account type, and current goal titles
- `sustainability_impacts`: each member's dated sustainability actions and estimated CO2e
- `activity_schedules`: recurring routines, their frequency, state, and next due date
- `goal_assessments`: private questionnaire answers and generated recommendations

The member dashboard links to `public/templates/igreen-activity-upload.xlsx`. Keep the worksheet name and header row unchanged; the import validates every row and calculates impact server-side. A matching member, date, category, activity name, and quantity is stored only once, regardless of entry method.

Existing Vercel Blob data is not imported automatically. Migrate it before removing the old store if it contains registrations that must be retained.

Do not prefix any of these values with `NEXT_PUBLIC_`. For stronger operational security, rotate the initially requested administrator password immediately after handoff and use a password manager.

## Verification

```bash
pnpm db:schema
pnpm typecheck
pnpm build
```

Impact figures are directional estimates for community engagement, not audited greenhouse-gas accounting.
