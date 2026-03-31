# Chirp

Chirp is an AI review assistant for home service businesses. The current product is centered on Google Business Profile reviews and gives owners a safer workflow for triaging reviews, generating draft replies, and manually posting approved responses.

## What Chirp does

- Imports reviews from Google Business Profile
- Analyzes sentiment, urgency, risk, and issue tags
- Generates AI-assisted draft replies with safety gates
- Sends email notifications for important reviews
- Supports manual approval, rejection, escalation, and mark-as-posted flows
- Provides a guided inbox, including an optional Focus Queue workflow

## Current scope

- MVP-first, single Next.js app
- Google Business Profile is the only review source
- Manual posting is the default publishing model
- Negative or risky reviews require manual review
- Product positioning is plumbing-first, though onboarding currently supports `plumbing`, `hvac`, `electrical`, and `roofing`

## Stack

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS + shadcn/ui
- Postgres
- Drizzle ORM
- Stripe billing
- OpenAI-powered review analysis and draft generation
- Resend for email notifications
- Playwright E2E tests

## Local development

1. Install dependencies:

```bash
pnpm install
```

2. Create `.env` in the repo root.

Minimum local env:

```env
POSTGRES_URL=postgresql://USER:PASSWORD@HOST:PORT/DB_NAME
AUTH_SECRET=replace-with-a-long-random-string
BASE_URL=http://localhost:3000
MOCK_EXTERNAL_SERVICES=true
```

Useful optional env vars:

```env
# AI
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

# Google Business Profile integration
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

# Google auth sign-in overrides
GOOGLE_AUTH_CLIENT_ID=
GOOGLE_AUTH_CLIENT_SECRET=

# Billing
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Email notifications
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# Internal job endpoint protection
INTERNAL_JOB_SECRET=
```

3. Apply the checked-in migrations:

```bash
pnpm db:migrate
```

4. Seed a demo workspace:

```bash
pnpm db:seed
```

5. Optionally seed mock reviews:

```bash
pnpm db:seed:mock-reviews
```

6. Start the app:

```bash
pnpm dev
```

7. Sign in with the seeded demo account:

```text
Email: owner@chirp-demo.com
Password: admin1234
```

## Recommended local mode

For day-to-day product work, `MOCK_EXTERNAL_SERVICES=true` is the easiest starting point.

In that mode:

- Google integration uses mock location data
- You can complete setup without live Google credentials
- The app still supports seeded reviews and inbox workflows
- Missing OpenAI credentials fall back to deterministic behavior where needed

## Background jobs

Chirp uses a DB-backed jobs flow for review sync, analysis, draft generation, and notifications.

The protected job-processing endpoint is:

```text
POST /api/internal/jobs/process
Header: x-internal-job-secret: <INTERNAL_JOB_SECRET>
```

`pnpm db:seed:mock-reviews` queues review analysis jobs and, by default, processes them for you.

## Testing and verification

Available scripts:

```bash
pnpm build
pnpm test:e2e
pnpm test:e2e:headed
pnpm test:e2e:ui
```

There are also unit tests under `tests/unit`, but there is not currently a dedicated package script for them.

## Project structure

```text
app/                  Next.js routes, pages, and route handlers
components/           UI components and feature-specific client components
lib/services/         Business logic
lib/db/               Drizzle schema, queries, migrations, seeds
lib/services/integrations/  Google integration logic
tests/unit/           Unit tests
tests/e2e/            Playwright smoke and authz coverage
```

## Notes

- Route handlers are intended to stay thin and delegate business logic to services
- Review workflows are designed to be auditable and conservative
- The inbox, setup wizard, settings, and activity views are the main product surfaces today
- `pnpm db:setup` exists as an interactive helper for Docker Postgres + Stripe CLI setup, but manual `.env` setup plus `pnpm db:migrate` is the most direct path

## License

See [LICENSE](./LICENSE).
