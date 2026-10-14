# Roadmap

Sequenced by dependency and risk, not by novelty — hardening comes before new
surface area, because new features built on an untested/unpatched base just
inherit its problems.

## Phase 0 — Hardening (should come first; low effort, real risk reduction)
- [ ] `npm audit fix` in `server/` (already prepared as a patch — zero
      breaking changes, confirmed via `npm audit` before/after)
- [ ] Remove the plaintext-password legacy fallback in `models/User.js`
      once any pre-bcrypt users are migrated
- [ ] Add an actual test suite: Jest + Supertest for the Express API
      (start with auth + trips, the highest-risk controllers), React
      Testing Library for the client. The CI pipeline already exists —
      it just isn't checking anything beyond formatting yet.
- [ ] Add Sentry (or equivalent) for real error visibility in production

_Estimated effort: 1–2 weeks for one contributor, mostly the test suite._

## Phase 1 — Already shipped this conversation
- [x] Emergency numbers lookup (backend + frontend tab) — tested end to end
- [x] Visa checker backend plumbing — honest "not configured" fallback,
      ready to go live once a provider API key is added
- [ ] Visa checker frontend tab — blocked on picking/signing up for a
      real visa-data provider (Sherpa, VisaList, Travel-Advisory-API)

## Phase 2 — Close the "mock data" gap
- [ ] Real flight/hotel booking via a real provider (Amadeus Self-Service
      has a workable free tier for a student project). This is arguably
      more valuable than any new feature — it's the difference between
      the app doing what it claims and not.
- [ ] Document expiry tracker (passport/visa/insurance), storing only
      expiry dates and labels — not full document numbers — per the PII
      caution already flagged.

## Phase 3 — Collaboration features
- [ ] Group trips: add `collaborators` to `Trip`, `splitBetween` to
      `Expense`, a settle-up balances view
- [ ] Real-time layer (Socket.io) — only stood up once group trips or
      live-location sharing actually need it, per the architecture doc

## Phase 4 — Offline & resilience
- [ ] PWA support (`vite-plugin-pwa`) caching the active trip's itinerary,
      packing list, and emergency numbers for offline access
- [ ] Push notifications for flight/weather/safety-checkin reminders

## Phase 5 — ML/AI features (matches applied-ML interest)
- [ ] Stand up a small Python/FastAPI microservice, called from the Node
      backend, rather than doing ML work in Node
- [ ] AI itinerary draft generation — clearly labeled as an editable
      AI-generated draft, never auto-committed as the final plan
- [ ] Trip cost prediction — realistically needs either a labeled public
      dataset or enough accumulated `Expense` data from real usage first;
      don't build the model before there's data to train it on

## Phase 6 — Scale infrastructure
- [ ] Redis for caching external lookups and as a shared rate-limit store
- [ ] BullMQ job queue to replace in-process cron — necessary before
      running more than one server instance, since the current cron sweep
      would double-alert on safety check-ins otherwise
- [ ] Object storage (S3-compatible) for real trip-photo uploads

## Explicitly deprioritized (not because they're bad ideas, but scope)
- Local guide marketplace — real product, not a feature sprint (trust,
  verification, payments, disputes)
- Community reviews/photos — needs ongoing moderation, a real cost, not
  a one-time build; don't take this on without a moderation plan
