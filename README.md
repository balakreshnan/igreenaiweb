# igreen.ai

A Material Design 3-inspired sustainability community built with Next.js. People, businesses, and enterprise teams can create private profiles, log practical actions, follow their progress, and download their own activity as CSV.

## What is included

- Mission-led responsive landing page with individual, business, and enterprise pathways
- Private account registration and sign-in with scrypt password hashing
- Signed, HTTP-only, same-site session cookies
- Personal impact dashboard, milestones, category summaries, activity history, and CSV export
- Protected administrator console for registration and community activity oversight
- A single private JSON data document in Vercel Blob; no personal data file is written into this repository
- Memory-only local development storage, reset whenever the dev server restarts

## Run locally

```bash
pnpm install
pnpm dev
```

Copy `.env.example` to `.env.local` and add development secrets if you need to test administrator access. `.env*` files are ignored by Git.

## Deploy securely on Vercel

1. Import the repository into Vercel.
2. In the project, create a **private Vercel Blob** store and connect it to this project. Vercel supplies `BLOB_READ_WRITE_TOKEN` automatically.
3. Add these server-only Environment Variables for Production, Preview, and Development as appropriate:
   - `SESSION_SECRET`: a random value of at least 32 bytes
   - `ADMIN_USERNAME`: the requested administrator username
   - `ADMIN_PASSWORD`: the requested administrator password
4. Deploy. The private `private/igreen-data.json` object is created on the first registration or update. It is not part of Git and is not served publicly.

Do not prefix any of these values with `NEXT_PUBLIC_`. For stronger operational security, rotate the initially requested administrator password immediately after handoff and use a password manager.

## Verification

```bash
pnpm typecheck
pnpm build
```

Impact figures are directional estimates for community engagement, not audited greenhouse-gas accounting. Production use at high write volume should migrate the single-document store to a transactional database while retaining private Blob exports or snapshots.
