# Feature Ideas — Beyond Visa & Solo-Traveler Safety

Grounded in the actual codebase (MERN, `features/` module structure, existing
Trip/Booking/Expense/Packing models) — each idea says what it reuses and what's
genuinely new.

## High value, reuses existing structure

**1. Real flight/hotel booking (replace the mock data)**
`bookingController.js` currently returns 5 hardcoded flights/hotels. Swapping
in a real provider (Amadeus Self-Service API has a free tier, or Skyscanner
via RapidAPI) turns the headline feature from a demo into something real.
This is arguably higher priority than any brand-new feature — it's fixing
the gap between what the app claims to do and what it does.

**2. Group trips & expense splitting**
`Trip` is currently single-owner; `Expense` tracks one user's spending. Adding
a `collaborators: [ObjectId]` array to `Trip` plus a `splitBetween` array on
`Expense` (Splitwise-style "who owes whom") turns solo trip-planning into
something usable for the friend-group trips people actually plan. Needs a
settle-up view (net balances between collaborators) — non-trivial but a
well-understood algorithm (debt simplification).

**3. AI itinerary suggestions**
Given a destination + trip length + budget + interests, generate a draft
day-by-day itinerary via an LLM API call, which the user then edits (never
auto-commits it — it's a starting draft, not authoritative). Fits naturally
as a new `TripItineraryTab` action ("Generate a draft") next to the existing
manual itinerary editor. This is genuinely new capability, not a data-fetch —
worth flagging that LLM output should be clearly labeled as AI-generated and
editable, not presented as verified local knowledge.

**4. Offline mode / PWA**
Once a trip is booked, connectivity abroad is unreliable. A service worker
caching the active trip's itinerary, packing list, and emergency numbers
(already built) for offline access is high real-world value for a travel app
specifically — more so than for most web apps. Vite has first-party PWA
plugin support (`vite-plugin-pwa`), which fits the existing build tooling
without a framework change.

## Medium value, moderate new surface area

**5. Multi-currency support**
`Expense.amount` is currently a bare number with no currency field. Adding a
`currency` field + a daily exchange-rate cache (via a free API like
exchangerate-api.io, refreshed on a cron similar to the existing safety
sweep) lets `TripBudgetTab` show totals in the user's home currency
regardless of where money was spent.

**6. Push notifications**
Flight-status changes, weather alerts for the trip destination, and
"your safety check-in is due soon" reminders — the last one meaningfully
strengthens the safety check-in feature that already exists. Web Push API +
a service worker; no native app needed.

**7. Trip cost prediction (ML)**
A genuinely good fit for an "applied ML" portfolio angle: a regression model
trained on historical trip data (destination, season, duration, traveler
count → typical cost) to give a budget estimate before the user fills in
expenses manually. Realistically needs a labeled dataset — either scraped
public travel-cost data or bootstrapped from the app's own `Expense` records
once there's enough volume. Best built as a small Python/FastAPI microservice
the Node backend calls, rather than trying to run ML in Node.

## Lower priority / good stretch goals

**8. Community trip reviews & photos** — needs real moderation (spam/abuse),
which is a genuine ongoing cost, not a one-time build. Don't underestimate
this if pursuing it.

**9. Local guide marketplace** — verified local guides bookable per
destination. Significant scope (verification/trust, payments, disputes) —
realistically a separate product, not a feature sprint.

**10. Two-factor authentication (TOTP)**
Given the app stores trip and emergency-contact data, optional 2FA
(`speakeasy` + QR code, using the already-installed `react-qr-code`
dependency) is a reasonable security hardening step, especially paired with
the plaintext-password-fallback removal already flagged.

**11. Carbon footprint estimate per trip**
Rough estimate from flight distance + transport mode. Nice-to-have,
low engineering cost, but the accuracy ceiling is low without real emissions
data — frame it as an illustrative estimate, not a certified figure.
