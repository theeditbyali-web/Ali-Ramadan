# Ledger

A multi-tenant accounting platform starter: sign up, get a business
("tenant") with a default chart of accounts, and record double-entry
journal transactions. This is **Phase 1** of a larger plan — payroll and
point-of-sale are not built yet (see Roadmap below).

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Prisma ORM, SQLite for local dev (swap to PostgreSQL for production —
  see below)
- Custom auth: email/password, JWT session cookie (`lib/auth.ts`)
- Multi-tenant: every table that holds business data has a `tenantId`
  column; a user's session carries which tenant they're acting as

## Running locally

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up to create a
business — it comes with a default chart of accounts (`lib/default-accounts.ts`)
already loaded.

Needs a `.env` (used by the Prisma CLI) and `.env.local` (used by the Next.js
app) — see `.env.local.example`. `.env` needs `DATABASE_URL`; `.env.local`
needs `AUTH_SECRET` (a long random string — generate one with
`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`).

## What's built (Phase 1)

- **Auth & multi-tenancy**: signup creates a `Tenant` + owner `User` +
  `Membership`; all data is scoped by `tenantId`. Routes under
  `/dashboard`, `/accounts`, `/journal`, `/reports` require a session
  (enforced in `proxy.ts`, Next's middleware/proxy convention).
- **Chart of Accounts** (`/accounts`): standard account types (asset,
  liability, equity, revenue, expense), seeded with a starter set including
  Lebanon-relevant accounts (VAT Payable, NSSF Payable).
- **General ledger** (`/journal`): double-entry journal entries — every
  entry must have debits equal credits, validated server-side before it's
  saved (`lib/actions/journal.ts`).
- **Trial Balance report** (`/reports/trial-balance`): sums every account's
  activity and confirms the books balance.

## Roadmap (not built yet)

- **Point of Sale**: ring up sales, which should post journal entries
  automatically (debit Cash/AR, credit Sales Revenue and VAT Payable) —
  the `JournalEntry.source` field already has a `"pos"` value reserved for
  this.
- **Payroll**: Lebanese income tax withholding and NSSF contributions.
  **Important**: exact current rates/brackets need to come from an
  accountant or Lebanon's Ministry of Finance/NSSF directly before this is
  built — tax rules there have changed frequently and getting this wrong
  has real consequences for your clients. The engine should be built so
  rates are editable config, not hardcoded.
- Multi-currency (Lebanon commonly operates in both LBP and USD).
- Multi-user per tenant (inviting staff — the `Membership`/`Role` model
  already supports OWNER/ADMIN/STAFF roles, but there's no invite flow yet).

## Deploying

For production you'll want real PostgreSQL rather than SQLite (better
concurrent-write support for a multi-tenant app):

1. In `prisma/schema.prisma`, change `provider = "sqlite"` to
   `provider = "postgresql"`.
2. Point `DATABASE_URL` at your Postgres instance (e.g. a managed database
   from Railway, Supabase, or Vercel Postgres).
3. Run `npx prisma migrate deploy`.
4. Deploy the Next.js app (e.g. to Vercel), with `DATABASE_URL` and
   `AUTH_SECRET` set as environment variables there.
