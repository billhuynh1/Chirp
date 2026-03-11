# AGENTS.md — Chirp Codebase Guide

This file provides context and instructions for AI coding agents working on the Chirp codebase.

## What This App Does

Chirp is an AI review assistant for home service businesses, starting with **plumbing companies**.

The product helps businesses respond to customer reviews faster and more consistently, especially **Google Business Profile** reviews. The app should:

- fetch reviews from Google Business Profile
- classify reviews by sentiment, urgency, and issue tags
- generate safe AI draft replies
- notify the business owner about important negative reviews
- let the owner approve, edit, reject, or mark replies as posted

The MVP is intentionally narrow:

- **target niche:** plumbers
- **review source:** Google Business Profile only
- **posting model:** manual posting first
- **notification channel:** email only
- **all negative/risky reviews require manual approval**

---

## Product Principles

When making implementation decisions, optimize for:

1. **Speed to MVP**
2. **Production-ready code**
3. **Low operational complexity**
4. **Safe AI behavior**
5. **Clear workflows over clever abstractions**

Do not overbuild for hypothetical future requirements.

Prefer the simplest architecture that cleanly supports:
- review ingestion
- AI analysis
- AI draft generation
- review inbox workflow
- notification delivery
- auditability

---

## Tech Stack

### Frontend
- Next.js (App Router)
- React Server Components
- TypeScript
- Tailwind CSS
- ShadCN UI

### Backend
- Next.js Route Handlers
- Postgres
- Drizzle ORM
- Vercel Cron for scheduled jobs
- DB-backed jobs table for background processing

### Testing
- Vitest

---

## Architecture Rules

### General
- Keep the app as a **single Next.js full-stack application** for MVP.
- Do **not** split into microservices.
- Do **not** introduce FastAPI or a separate worker service unless explicitly requested.
- Prefer a **service-layer architecture** over fat route handlers.

### Preferred layering
Use this separation consistently:

- **UI layer**: rendering, forms, local interaction only
- **Route handlers / server actions**: authentication, input parsing, authorization, orchestration
- **Service layer**: business logic
- **Data access layer**: database queries and persistence helpers
- **Integrations layer**: Google, AI provider, email provider
- **Jobs layer**: background task orchestration

### Route handler rule
Route handlers should be thin. They should:
- authenticate the request
- validate input
- call a service
- return a response

They should **not** contain core business logic.

---

## React / Frontend Best Practices

### Default approach
- Prefer **React Server Components** for data fetching.
- Use client components only for:
  - interactive forms
  - inbox actions
  - local UI state
  - copy/edit/regenerate interactions

### Avoid `useEffect`
Avoid `useEffect` unless absolutely necessary.

Prefer:
- server-side data fetching
- derived state
- controlled inputs
- event handlers
- memoized computations only when there is measurable benefit
- using primitive components from shadcn for consistent styling

Do not use `useEffect` for:
- syncing props into state unnecessarily
- fetching data that can be fetched on the server
- running logic that belongs in event handlers

### Composition
- Build components to be **small, composable, and single-responsibility**
- Prefer composition over monolithic components
- Extract reusable UI patterns when there is actual repetition
- Avoid deeply nested component trees with unclear ownership

### State management
- Prefer local state first
- Use React Context only for truly shared UI/application state
- Do **not** introduce external state libraries unless explicitly requested
- Do **not** use context as a dumping ground for state that should live closer to usage

### Prop drilling
Avoid excessive prop drilling.

Preferred solutions:
1. move logic closer to where state is used
2. extract cohesive child components
3. use server boundaries to reduce prop passing
4. use context only when state is genuinely shared across distant branches

Do not introduce context prematurely.

### Forms
- Use clear validation boundaries
- Keep form state predictable
- Surface validation errors explicitly
- Handle loading, success, and error states cleanly

### UI
- Use ShadCN as the base UI system
- Do **not** reinstall or regenerate ShadCN components
- The styling has already been customized
- Reuse existing primitives before creating new ones

---

## Backend Best Practices

### Validation
Always validate and sanitize inputs before processing.

Validate at the boundary:
- route handlers
- server actions
- webhook handlers
- internal job endpoints

Never trust:
- client input
- query params
- external API responses
- AI model output

### Authorization
Every mutation and read must enforce correct workspace/business access.

Always verify:
- authenticated user exists
- user belongs to the business/workspace being accessed
- user has the required role for the action

Do not rely on frontend restrictions for security.

### Error handling
Think production-ready on every task.

Always handle:
- missing records
- expired integrations
- duplicate requests
- invalid external responses
- partial failures
- missing environment variables

Fail loudly, not silently.

### Environment variables
- Validate required environment variables at startup or first use
- Do not allow silent fallback behavior for critical secrets
- Use named helpers for env access if useful

### Business logic
Keep business logic in services, not in route handlers or UI code.

Examples of service-layer logic:
- review sync orchestration
- review deduplication
- urgency/risk rules
- AI draft gating
- notification triggering
- audit log writes

---

## Database and Data Modeling

### Database principles
- Model for clarity first
- Keep schemas normalized enough to avoid confusion
- Add indexes intentionally
- Use enums/status fields consistently
- Prefer explicit columns over vague JSON blobs for core workflow fields

### Schema safety
- Do not drop or recreate tables unless explicitly instructed
- Do not make destructive schema changes casually
- Preserve data whenever possible

### Migrations
- Never use `drizzle-kit push` against production
- Always generate migrations with `drizzle-kit generate`
- Apply migrations with `drizzle-kit migrate`
- Review generated SQL before applying
- Keep migrations deterministic and readable

### Drizzle
- Keep schema definitions clean and explicit
- Use typed queries
- Avoid scattered raw SQL unless there is a strong reason
- If raw SQL is required, isolate it and make it easy to audit

---

## Background Jobs

This app relies on background processing for:
- syncing reviews
- analyzing reviews
- generating drafts
- sending notifications

### Job design rules
- Use a **Postgres-backed jobs table**
- Design jobs to be **idempotent**
- Retries must be safe
- Store job status and failure reasons
- Do not assume a job runs exactly once
- Avoid hidden coupling between jobs

### Job handling
Every job should define:
- trigger
- input payload
- idempotency strategy
- retry policy
- failure behavior

### Cron
- Use Vercel Cron or equivalent scheduler for MVP
- Internal job-processing endpoints must be protected by a secret
- Do not expose job-processing endpoints publicly

---

## Integrations

### Google Business Profile
Google Business Profile is the only review source in MVP.

Treat Google integration as production-sensitive:
- OAuth tokens must be encrypted at rest
- refresh tokens must never reach the client
- handle token expiry and reauth cleanly
- log sync failures clearly
- do not silently drop failed sync attempts

### AI provider
The AI layer is for:
- structured review analysis
- safe reply draft generation

The AI layer is **not** the source of truth.

Always:
- validate structured outputs
- apply rule-based safety checks after generation
- suppress drafts when safety checks fail
- require manual approval for risky/negative reviews

### Email provider
Use email only for MVP notifications.

Emails must be:
- idempotent when appropriate
- logged
- retryable on transient failure

---

## AI Safety and Prompting Rules

This app is workflow software, not a generic chatbot.

### AI outputs must be constrained
The AI must not:
- invent facts
- admit liability
- promise refunds or compensation unless explicitly allowed
- claim actions not verified by the business
- generate overly defensive or argumentative replies
- mention private/internal details

### AI architecture
Prefer a two-step flow:
1. **analysis**
2. **draft generation**

Do not combine them into a single opaque step if it weakens control.

### Safety gates
Negative or risky reviews must be treated conservatively.

Manual review is required for:
- all 1-star and 2-star reviews
- damage claims
- billing disputes
- legal threats
- discrimination claims
- safety concerns
- low-confidence outputs
- failed output validation

### Prompt design
Prompts should:
- use explicit structured inputs
- reflect plumbing-specific language and issues
- include hard rules and banned behaviors
- request structured outputs where possible

Keep prompts versioned and easy to update.

---

## API Design Principles

- Keep APIs consistent and predictable
- Prefer resource-oriented route structure
- Avoid overly granular endpoints unless needed
- Return typed, structured responses
- Use appropriate HTTP status codes
- Make mutation endpoints idempotent where useful

Do not leak internal-only fields to the frontend unnecessarily.

---

## Testing

### Framework
- Vitest

### Rules
- Tests must not hit live external services
- Mock Google APIs, AI provider calls, and email delivery
- Each test must be isolated and clean up after itself
- Prefer deterministic tests over snapshot-heavy tests

### Priority areas to test
- auth and authorization boundaries
- review import/deduplication logic
- job retry/idempotency behavior
- AI output validation
- urgency/risk classification rules
- approval/edit/reject workflow
- mark-as-posted flow
- integration failure handling
- missing environment variable handling

### Test philosophy
Do not write trivial tests for the sake of coverage.
Test business-critical paths and failure modes.

### Verification Gates (Required)
- For any UI change, always run `npm run build`.
- For any UI change, perform a browser runtime smoke check on the changed page(s):
- open the page
- click through changed interactions
- confirm there is no red runtime error overlay
- confirm browser console has no uncaught errors from the changed flow
- If browser runtime verification is not possible in-session, explicitly report that limitation and do not claim runtime verification was completed.

---

## Performance and Reliability Expectations

- Inbox pages should remain responsive under normal SMB workloads
- Avoid N+1 queries
- Batch background work when reasonable
- Use pagination for review lists
- Be careful with over-fetching in dashboard views
- Prefer incremental improvements over premature optimization

---

## Code Quality Standards

### General
- Prefer explicit over implicit
- Avoid magic numbers; use named constants
- Use clear, self-explanatory names
- Keep functions focused
- Keep modules cohesive
- Avoid deeply coupled code

### Reuse
- Extract shared logic when there is real repetition
- Do not over-abstract after seeing only one use case
- Prefer stable abstractions over speculative ones
- Prefer to use colors and themes from the global.css file. Only use tailwind utility colors when necessary.
- Prefer to use the styling from ShadCN components rather than custom styling inline of those components.

### Comments
- Do **not** add comments unless they clarify non-obvious logic
- Do **not** restate what the code already clearly expresses
- Prefer self-explanatory variable and function names over comments

Only comment:
- complex business logic
- edge-case handling
- security-sensitive code
- non-obvious integration behavior
- non-trivial job orchestration
- AI safety constraints that are not obvious from code alone

Bad:
```ts
// Increment counter
count++;

---

Dependencies:
- Do not introduce new dependencies without a clear reason
- Prefer built-in platform/library capabilities first
- Any new dependency should solve a real problem, not stylistic preference

---

Output Expectations:
At the end of every task, always list:
- Every file you created or modified
- Any new environment variables required
- Any database schema changes needed
- Any follow-up tasks or known limitations
