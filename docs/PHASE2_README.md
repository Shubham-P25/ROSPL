# Phase 2 delivery — Document Tracker + Real Flight Booking (Amadeus)

## Important: a correction from earlier in this build

Partway through this work, the working directory being used for this project
was found to contain files that do not exist in the real upstream GitHub
repo (`hitesh-kumar123/Travel-Plans-`) — a fake "safety check-in" feature and
a fake Amadeus integration, among others. This was confirmed by cloning the
same commit hash fresh and diffing. Those files were never created via any
recorded action in this build process, and the cause is unknown — that is
stated plainly rather than guessed at.

**Practical effect on you:** two claims made earlier in this conversation
were wrong — that a safety check-in feature "already existed" in the repo,
and a later claim that flight booking already had real Amadeus search. The
first accurate read (flight/hotel booking is 100% mock data) was correct.
Everything in this delivery was rebuilt from a freshly, independently
verified clean clone of the real repo, not from the tainted directory.

## What's new in this delivery

### 1. Document expiry tracker (fully working)
- `server/models/Document.js` — stores type, label, issuing country, expiry
  date. **Deliberately does not store full document numbers** — only an
  expiry date and a label (e.g. "Indian Passport"). If a number field is
  ever added, it should be encrypted at rest, not stored plaintext.
- `server/controllers/documentController.js` + `server/routes/documents.js`
  — full CRUD, scoped to the authenticated user.
- `client/src/features/trips/tabs/TripDocumentsTab.jsx` — new "Documents"
  tab on the trip detail page, with expiry-status badges (Valid / Expiring
  soon / Expired), the last two triggered within 180 days of expiry (a
  common visa-rejection threshold).

**Tested, not just written:**
- Auth enforcement (401 without a token) — real HTTP request.
- Field validation (missing fields, invalid `type`, invalid `expiryDate`)
  — all return correct 400s via real HTTP requests.
- Expiry-status math verified against three cases (30 days out → "expiring
  soon", 400 days out → "ok", 10 days past → "expired").
- Frontend: real `npm run build`, succeeded with no errors.

**Not tested:** the actual database-backed create/read/update/delete against
a live MongoDB. `mongodb-memory-server` was tried for a real integration
test but needs to download a MongoDB binary from `fastdl.mongodb.org`, which
is outside this sandbox's network allowlist. The validation logic runs
*before* any database call, so it was tested in isolation; the DB
persistence itself was not.

### 2. Real flight booking via Amadeus (plumbing done, live call unverified)
- `server/utils/amadeusClient.js` — OAuth2 client-credentials flow, IATA
  location resolution, flight-offer search. Written from Amadeus's published
  API reference.
- `server/controllers/bookingController.js` — `searchFlights` now tries live
  Amadeus data if `AMADEUS_CLIENT_ID`/`AMADEUS_CLIENT_SECRET` are set in
  `.env`, and falls back to the existing mock flights otherwise or on any
  failure. Every response carries `source: "amadeus" | "mock"` so it's never
  ambiguous which one you got, and a `note` field explains why when it falls
  back.
- Hotel search (`searchHotels`) was **not** converted — it remains 100%
  mock, unchanged. Converting it would need the same treatment (Amadeus
  Hotel Search v1/v3, a two-step city→hotel-list→offers flow) but wasn't
  done in this pass; flagging that rather than leaving it ambiguous.

**Tested, not just written:**
- The "not configured" fallback path, via a real HTTP POST to
  `/api/booking/flights/search` with no Amadeus credentials set — correctly
  returned mock data labeled `source: "mock"` with an explanatory note.
- The Amadeus response-mapping logic (`mapAmadeusFlightOffer`,
  `parseIsoDuration`, `timePartOf`), run against a sample object shaped
  exactly like Amadeus's own published Flight Offers Search v2 example
  response — correctly extracted airline, price, times, and duration.

**Not tested, and cannot be from this environment:** an actual live call to
Amadeus's API. Two independent blockers: no `AMADEUS_CLIENT_ID`/`SECRET`
were available, and this sandbox's network egress is restricted to a fixed
allowlist that does not include `api.amadeus.com` or `test.api.amadeus.com`
— so even with credentials, a live call could not have been made here. To
verify: sign up for Amadeus's free self-service tier
(developers.amadeus.com/register), set the two env vars, and run a real
search — the OAuth flow, request shapes, and response mapping are ready to
be checked against reality, but "matches the published docs" and "confirmed
working live" are different claims, and only the first one is true today.

## Install

1. Copy the new/changed files into the matching paths in your repo (see
   `PHASE2_CHANGES.patch` for the diff on modified files: `server.js`,
   `server/.env.example`, `bookingController.js`, `TripDetailPage.jsx`).
2. No new npm packages required.
3. To enable live flight search: set `AMADEUS_CLIENT_ID` and
   `AMADEUS_CLIENT_SECRET` in `server/.env` per the updated
   `.env.example`.

## Also included from the previous round (carried over, re-verified on the clean base)
- Emergency numbers lookup + trip tab (unchanged, re-tested here)
- Visa checker backend stub (honest "not configured" fallback, no frontend
  yet — same reasoning as the Amadeus caveat above: no fake UI over no real
  data)
- `docs/FEATURE_IDEAS.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`
