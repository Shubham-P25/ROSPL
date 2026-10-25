# ROSPL: Reliable Trip Planner — Agent Implementation Script

Repo: github.com/Shubham-P25/ROSPL
Stack: React/Vite client, Express/Node server, MongoDB. Frontend on Vercel, backend on Render.
Goal: contribute a reliable, $0, open-source trip planner to the Travel-Plans (PackGo) project.

---

## 0. How to use this file

1. Give this whole file to your coding agent as the first message of the task.
2. Tell it: "Do Phase 0 only. Stop and show me docs/AUDIT.md."
3. After you approve the audit, run one phase at a time. Each phase has its own kickoff prompt in
   section 14. One phase = one branch = one PR.
4. Never let the agent skip ahead. Review every diff yourself before merging.

Why: agents produce their best work with small, well-specified tasks, real docs, and tests that
define "done". Most agent failures come from huge tasks with vague goals.

---

## 1. Context and goals

ROSPL is a travel app with these sections: Itinerary, Places, Budget & Expenses, Packing,
Documents, Notes. We want a trip planner where the user enters a destination, number of days,
budget, and interests, and gets a complete day-by-day plan with places, map, weather, budget
split, packing list, and photos.

Optional extras (never required for the plan to work):
- Featured travel videos/blog links for the destination.
- An AI assistant (summaries, tips, swapping places, chat) using the user's own free key.

What we are NOT doing:
- No RAG for now.
- No scraping random blogs to build the plan.
- No paid APIs or paid hosting.

---

## 2. Hard constraints

1. $0 and open source. No paid services, no card required for any dependency.
2. Existing features (Google sign-in, trips, flights, visa check, email) must keep working.
3. The core planner works with NO LLM key, NO scraping, and NO user-provided key.
4. Optional features fail silently and never block or delay a plan.
5. Never commit secrets. Every new env var goes into `.env.example` and the README.
6. One branch and one PR per phase. Small PRs. No unrelated refactors.
7. Never guess an API. Read the official docs for each service before writing its adapter, and
   record the doc URL in a comment at the top of the adapter file.
8. Follow the upstream Travel-Plans contribution rules (CONTRIBUTING, code style, PR template).

---

## 3. Design principles (and why)

**P1. Pure core, replaceable edges.**
The planner core is a set of pure functions: data in, plan out. It does no HTTP and no database
access. Reason: it is deterministic, trivially testable, and cannot fail because an API is down.

**P2. Every external service sits behind an adapter.**
Each adapter returns the same internal `Place` shape. The core never knows which API supplied the
data. Reason: replacing or adding a provider is one new file, and tests use recorded fixtures.

**P3. Fallback chain on every call.**
Live API, then stale cache, then seed data, then an empty result flagged `degraded`.
Reason: "never breaks" is impossible, but "always returns a usable plan" is achievable.

**P4. Validate at every boundary.**
Use zod for incoming requests, adapter output, and any AI output. Drop bad items instead of
throwing. Reason: one malformed API item must not crash a whole plan.

**P5. Jobs plus snapshots.**
Plan generation runs as a background job. A saved plan is an immutable snapshot. Reason: Render's
free tier is slow and sleeps, and a later API outage must never change a saved plan.

**P6. Optional means quiet.**
AI, video/blog highlights, and photos are feature-flagged with short timeouts. If they fail,
their UI simply does not render. Reason: the core plan must never wait on a nice-to-have.

**P7. Cache everything, expire everything.**
Free-tier MongoDB storage is small and free APIs have rate limits. Cache compactly with TTLs.

---

## 4. Architecture

```
React UI (form, progress, itinerary, map, tabs)
        |
Express API  -- validate (zod) --> create PlanJob --> return { jobId }
        |
Job runner (in-process, state stored in MongoDB)
        |
+-------------------------------------------------------------+
| PLANNER CORE (pure): score -> cluster -> order -> slots ->  |
|                      budget -> packing                      |
+-------------------------------------------------------------+
     ^                    ^                       ^
Provider adapters     Mongo TTL cache         Seed data (JSON)
(OpenTripMap,         (stale-while-           (3-5 popular
 Wikivoyage,           revalidate)             destinations)
 Open-Meteo,
 Nominatim,
 Wikimedia,
 Frankfurter)

Optional plugins (feature-flagged): highlights (YouTube/curated), ai (BYO free key)
```

Suggested layout under `server/src/` (adapt to the real structure found in Phase 0):

```
planner/        scoring.js cluster.js order.js slots.js budget.js packing.js index.js + *.test.js
providers/      opentripmap.js nominatim.js wikivoyage.js openmeteo.js wikimedia.js frankfurter.js
cache/          cache.js (Mongo model + get/set/stale logic)
jobs/           runner.js model.js routes.js
plugins/        highlights/  ai/
seed/           destinations/*.json
schemas/        place.js request.js plan.js
lib/            withFallback.js haversine.js logger.js
test/fixtures/  recorded API responses (JSON)
```

---

## 5. Data contracts (zod)

```js
// schemas/place.js
import { z } from 'zod';

export const CATEGORIES = ['culture','nature','food','shopping','adventure','nightlife','religious','other'];

export const PlaceSchema = z.object({
  id: z.string().min(1),                 // stable: `${source}:${sourceId}`
  name: z.string().min(1).max(200),
  category: z.enum(CATEGORIES),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  rating: z.number().min(0).max(5).optional(),      // normalized 0..5
  popularity: z.number().min(0).max(1).optional(),  // normalized 0..1
  visitMinutes: z.number().int().min(15).max(480).default(90),
  estCost: z.number().min(0).optional(),            // in the trip currency
  description: z.string().max(600).optional(),
  photoUrl: z.string().url().optional(),
  photoCredit: z.string().max(300).optional(),      // REQUIRED when photoUrl comes from Wikimedia
  source: z.string(),                               // 'opentripmap' | 'seed' | ...
  sourceUrl: z.string().url().optional(),
});
```

```js
// schemas/request.js
export const PlanRequestSchema = z.object({
  destination: z.string().min(2).max(100),
  days: z.number().int().min(1).max(14),
  budget: z.number().positive().max(100000000),
  currency: z.string().length(3).default('INR'),
  travellers: z.number().int().min(1).max(20).default(1),
  interests: z.array(z.enum(CATEGORIES)).min(1).max(6),
  pace: z.enum(['relaxed','normal','packed']).default('normal'),
  startDate: z.string().date().optional(),
});
```

```js
// schemas/plan.js
export const PlanSchema = z.object({
  request: PlanRequestSchema,
  days: z.array(z.object({
    day: z.number().int(),
    items: z.array(z.object({
      placeId: z.string(),
      slot: z.enum(['morning','afternoon','evening']),
      travelMinutesFromPrev: z.number().int().min(0),
    })),
    estCost: z.number().min(0),
  })),
  places: z.record(PlaceSchema),                    // map placeId -> Place (snapshot)
  budget: z.object({
    stay: z.number(), food: z.number(), transport: z.number(),
    activities: z.number(), buffer: z.number(),
  }),
  weather: z.any().optional(),
  packing: z.array(z.object({ item: z.string(), reason: z.string() })).default([]),
  warnings: z.array(z.string()).default([]),
  degraded: z.array(z.string()).default([]),       // e.g. ['photos','weather']
  generatedAt: z.string(),
  schemaVersion: z.literal(1),
});
```

Rule: any field added later must be optional or have a default, so old snapshots keep loading.

---

## 6. Resilience utilities

### 6.1 withFallback

```js
// lib/withFallback.js
export async function withFallback(chain, { timeoutMs = 4000, retries = 1, validate = (x) => Array.isArray(x) && x.length > 0 } = {}) {
  const errors = [];
  for (const [i, fn] of chain.entries()) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      let timer;
      try {
        const res = await Promise.race([
          fn(),
          new Promise((_, rej) => { timer = setTimeout(() => rej(new Error('timeout')), timeoutMs); }),
        ]);
        clearTimeout(timer);
        if (validate(res)) return { data: res, degraded: i > 0, errors };
        errors.push(`step ${i}: empty/invalid result`);
        break; // do not retry an empty result
      } catch (e) {
        clearTimeout(timer);
        errors.push(`step ${i} attempt ${attempt}: ${e.message}`);
      }
    }
  }
  return { data: [], degraded: true, errors };
}
```

Usage: `withFallback([() => otm.search(q), () => cache.getStale(key), () => seed.get(q.city)])`

### 6.2 Cache with stale-while-revalidate

Do NOT use a plain TTL index for freshness: Mongo deletes expired docs, so you could never serve
stale data. Use two dates: `freshUntil` (soft) and `expiresAt` (hard, TTL index, much later).

```js
// cache/cache.js
const CacheSchema = new mongoose.Schema({
  key: { type: String, unique: true, index: true },
  value: mongoose.Schema.Types.Mixed,
  freshUntil: Date,
  expiresAt: { type: Date, index: { expires: 0 } },   // hard delete, e.g. 30 days
}, { versionKey: false });

export async function cacheGet(key) {            // returns { value, stale } or null
  const doc = await Cache.findOne({ key }).lean();
  if (!doc) return null;
  return { value: doc.value, stale: doc.freshUntil < new Date() };
}
export async function cacheSet(key, value, { freshMs, hardMs = 30 * 864e5 }) {
  const now = Date.now();
  await Cache.updateOne({ key }, { $set: { value, freshUntil: new Date(now + freshMs), expiresAt: new Date(now + hardMs) } }, { upsert: true });
}
```

Suggested freshness: places 7 days, geocoding 90 days, photos 30 days, weather forecast 3 hours,
currency 12 hours. Keep stored values compact (store the normalized `Place`, not raw API bodies).

---

## 7. Planner algorithm (pure code)

Input: `{ request, places[] }`. Output: a `Plan` without `weather`/`photos` (added by the job).

### 7.1 Scoring

```js
// planner/scoring.js
export function scorePlaces(places, interests) {
  const want = new Set(interests);
  return places
    .map((p) => {
      const interest = want.has(p.category) ? 1 : 0.35;
      const rating = (p.rating ?? 3.5) / 5;
      const pop = p.popularity ?? 0.3;
      return { ...p, score: 0.45 * interest + 0.30 * rating + 0.25 * pop };
    })
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)); // deterministic tie-break
}
```

Also de-duplicate: drop places whose normalized name matches, or that are within ~50 m of a
higher-scored place with a similar name.

### 7.2 Capacity

```js
const STOPS = { relaxed: 3, normal: 4, packed: 5 };
const capacity = request.days * STOPS[request.pace];
const selected = scored.slice(0, capacity);   // if fewer places exist, plan fewer stops and add a warning
```

### 7.3 Distance

```js
// lib/haversine.js
export function haversineKm(a, b) {
  const R = 6371, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
export const travelMinutes = (km) => Math.round((km / 25) * 60) + 5; // ~25 km/h city average + buffer
```

### 7.4 Cluster into days (deterministic k-means with balancing)

```js
// planner/cluster.js
export function clusterIntoDays(places, k, maxPerDay) {
  if (k === 1) return [places];
  // farthest-first init, starting from the top-scored place (deterministic)
  const centers = [places[0]];
  while (centers.length < k) {
    let best = null, bestD = -1;
    for (const p of places) {
      const d = Math.min(...centers.map((c) => haversineKm(p, c)));
      if (d > bestD) { bestD = d; best = p; }
    }
    centers.push(best);
  }
  let cur = centers.map((c) => ({ lat: c.lat, lng: c.lng }));
  let groups = [];
  for (let iter = 0; iter < 10; iter++) {
    groups = Array.from({ length: k }, () => []);
    for (const p of places) {
      let bi = 0, bd = Infinity;
      cur.forEach((c, i) => { const d = haversineKm(p, c); if (d < bd) { bd = d; bi = i; } });
      groups[bi].push(p);
    }
    cur = groups.map((g, i) => g.length
      ? { lat: g.reduce((s, p) => s + p.lat, 0) / g.length, lng: g.reduce((s, p) => s + p.lng, 0) / g.length }
      : cur[i]);
  }
  // balance: move the farthest members of oversized groups to the nearest group with room
  for (const g of groups) {
    while (g.length > maxPerDay) {
      const ci = groups.indexOf(g);
      g.sort((a, b) => haversineKm(b, cur[ci]) - haversineKm(a, cur[ci]));
      const moved = g.shift();
      const target = groups
        .map((gg, i) => ({ gg, i }))
        .filter(({ gg }) => gg !== g && gg.length < maxPerDay)
        .sort((a, b) => haversineKm(moved, cur[a.i]) - haversineKm(moved, cur[b.i]))[0];
      if (!target) { g.push(moved); break; }
      target.gg.push(moved);
    }
  }
  return groups.filter((g) => g.length).sort((a, b) => b.length - a.length);
}
```

### 7.5 Order each day (nearest neighbour then 2-opt)

```js
// planner/order.js
const pathKm = (r) => r.slice(1).reduce((s, p, i) => s + haversineKm(r[i], p), 0);

export function orderDay(places) {
  if (places.length <= 2) return places;
  const left = [...places];
  const route = [left.shift()];                       // start from the highest-scored place
  while (left.length) {
    const last = route[route.length - 1];
    left.sort((a, b) => haversineKm(last, a) - haversineKm(last, b));
    route.push(left.shift());
  }
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < route.length - 1; i++) {
      for (let j = i + 1; j < route.length; j++) {
        const cand = [...route.slice(0, i), ...route.slice(i, j + 1).reverse(), ...route.slice(j + 1)];
        if (pathKm(cand) + 1e-9 < pathKm(route)) { route.splice(0, route.length, ...cand); improved = true; }
      }
    }
  }
  return route;   // n <= 6 per day, so this is instant
}
```

### 7.6 Time slots

Fill each day from 09:00. A place's `visitMinutes` plus `travelMinutes` advance the clock. Lunch
break 60 min around 13:00, dinner after 19:00. Slot is `morning` before 12:00, `afternoon` before
17:00, else `evening`. If a day overflows 21:00, move its last stop to the lightest day.

### 7.7 Budget

```js
// planner/budget.js
const SPLIT = { stay: 0.40, food: 0.25, transport: 0.15, activities: 0.15, buffer: 0.05 };
export function splitBudget(total) {
  const out = {};
  for (const [k, v] of Object.entries(SPLIT)) out[k] = Math.round(total * v);
  return out;
}
```

Per-destination multipliers (cheap, mid, expensive) can live in seed data later. Warn when the
sum of `estCost` over selected places exceeds `budget.activities`. When `estCost` is unknown, use a
category default and mark the estimate as approximate in the warnings.

### 7.8 Packing (rule-based, no LLM)

Rules from weather and trip: rain probability > 40% adds umbrella/raincoat; max temp > 32 C adds
sunscreen, hat, water bottle; min temp < 12 C adds jacket; religious places add modest clothing;
nature/adventure adds walking shoes; trips > 5 days add laundry bag. Always include documents,
charger, power bank, basic medicines. Each item carries a `reason` string.

---

## 8. Providers (verify every endpoint in the official docs first)

| Provider | Use | Key | Notes |
|---|---|---|---|
| OpenTripMap | places by radius/category | free key (already used) | normalize `rate` to 0..5 and popularity to 0..1; skip items with no name |
| Nominatim (OSM) | geocode destination | none | max about 1 request/second, send a descriptive User-Agent, no autocomplete, cache 90 days |
| Wikivoyage / Wikipedia | guide text, tips, descriptions | none | use the MediaWiki API and the REST page summary endpoint; content is CC BY-SA, so store the page URL and show attribution |
| Open-Meteo | forecast and climate | none | forecast only covers about 16 days, so for later dates use the historical/climate endpoints and say "typical weather"; free tier is for non-commercial use |
| Wikimedia Commons | place photos | none | every image has a license and author: store `photoCredit`, and show it in the UI |
| Frankfurter | currency | none | use the base URL the project already uses; cache 12h |
| YouTube Data API | featured videos (optional) | free key | search calls cost a lot of quota units, so cache per destination for days and cap calls per day |

Adapter checklist (every adapter):
1. Doc URL comment at the top.
2. `search`/`fetch` function returning normalized, zod-validated data.
3. Timeout 4s, one retry, descriptive User-Agent where required.
4. Fixture files in `test/fixtures/<provider>/` and a contract test using msw or nock.
5. Never throws to the caller: returns `[]` or `null` and logs a warning.


---

## 9. Job system

State lives in MongoDB (no Redis, no paid queue). The runner is in-process.

```js
// jobs/model.js  (collection: plan_jobs)
{ _id, userId, status: 'queued'|'running'|'done'|'failed', progress: 0..100,
  stage: 'places'|'weather'|'planning'|'photos'|'saving', request, planId?, error?,
  createdAt, updatedAt }
```

Flow:
1. `POST /api/planner/jobs` validates the body with `PlanRequestSchema`, creates a job, returns `202 { jobId }`.
2. The runner executes stages in order and updates `progress` and `stage` after each:
   1. geocode destination (cache, then Nominatim, then seed)
   2. fetch places (cache, then OpenTripMap, then Wikivoyage list, then seed)
   3. fetch weather (failure only adds `weather` to `degraded`)
   4. run the pure planner core
   5. enrich photos and descriptions (failure only adds `photos` to `degraded`)
   6. validate with `PlanSchema` and save the snapshot
3. `GET /api/planner/jobs/:id` returns status, progress, stage, and `planId` when done.
   The client polls every 1.5 s (simple and works on Render free tier; SSE is optional).
4. Render free instances sleep and restart: on boot, mark jobs stuck in `running` for more than
   2 minutes as `failed` with a "retry" hint. Retrying is idempotent (same request hash returns
   the cached finished plan).
5. Limit to 1 running job per user and a small global concurrency (for example 3).

Stage results are cached, so a retry after a partial failure is fast.

---

## 10. API surface

| Method | Route | Purpose |
|---|---|---|
| POST | /api/planner/jobs | create a plan job |
| GET | /api/planner/jobs/:id | job status |
| GET | /api/plans/:id | saved plan snapshot |
| PATCH | /api/plans/:id | user edits (reorder, remove, add place) |
| POST | /api/plans/:id/days/:n/regenerate | regenerate one day |
| GET | /api/health | provider and database status |

All routes: auth middleware (existing Google sign-in), zod validation, rate limiting, `helmet`,
and consistent error shape `{ error: { code, message } }`. Never return stack traces.

User edits create a new revision of the snapshot (keep `revision` and `updatedAt`). The planner
core is only re-run for "regenerate this day", using the plan's stored `places` snapshot, so it
does not depend on live APIs.

---

## 11. Frontend

Components (adapt to existing UI conventions and CSS approach):
- `PlannerForm`: destination, days, budget + currency, interests (chips), pace, travellers.
- `PlanProgress`: shows the stage and progress; allows cancel and retry.
- `ItineraryView`: tabs per day, stop cards, travel time between stops, day cost.
- `PlaceCard`: photo with lazy loading and placeholder, rating, short description, source link, photo credit.
- `MapView`: Leaflet with OpenStreetMap tiles, numbered markers per day, route polyline.
  Keep the OSM attribution; OSM's public tile servers are meant for light use, so no heavy prefetching.
- `BudgetPanel`: the split, user-editable, warnings.
- `PackingPanel`: checklist with reasons, user can add or tick items.
- `FeaturedGuides` (Phase 5) and `AssistantPanel` (Phase 6): rendered only when enabled and available.

UX rules:
- Show partial results with clear notes: "Plan ready. Photos unavailable right now."
- Loading skeletons, empty states, and an error boundary around every optional panel.
- Never show raw errors. Show a friendly message plus a retry button.
- Accessible: labels, keyboard navigation, alt text, sufficient contrast.

---

## 12. Phases (each = branch + PR)

### Phase 0: Audit (no code changes) — branch `docs/audit`
- Read the whole repo. Create `docs/AUDIT.md` with: folder map, models, routes, current tab code
  (Itinerary, Places, Budget, Packing, Notes, Documents), APIs in use, env vars, deployment config,
  test and CI status, duplicated or dead code, security issues noticed.
- Propose exact file paths for the new modules, adapted to the real structure.
- Compare with Travel-Plans contribution rules and list any conflict.
- Acceptance: AUDIT.md reviewed and approved by the user. STOP until approved.

### Phase 1: Foundations + walking skeleton — branch `feat/planner-foundation`
- Add zod, schemas, `withFallback`, cache model, job model/runner/routes, `/api/health`, logger.
- Planner core v0 on seed data for 2 to 3 cities; minimal UI end to end.
- Acceptance: a plan for a seed city with zero external calls; tests pass; CI green.

### Phase 2: Core algorithm — branch `feat/planner-core`
- Implement sections 7.1 to 7.8 as pure functions with unit tests.
- Property-based tests (fast-check): no duplicate places, no day over the stop limit, empty input
  gives an empty plan with a warning, budget warnings are correct, output is deterministic.
- Acceptance: coverage on `planner/` is at least 90 percent; tests run in under 5 seconds.

### Phase 3: Provider adapters — branch `feat/planner-providers` (one commit per adapter)
- OpenTripMap, Nominatim, Wikivoyage/Wikipedia, Open-Meteo, Wikimedia, Frankfurter.
- Fixtures, contract tests, fallback chains wired into the job stages, cache wiring.
- Acceptance: with every provider mocked to fail, the seed-city plan still completes; with real
  providers, a new city works; `/api/health` reports provider status.

### Phase 4: Integrate with existing tabs — branch `feat/planner-ui`
- Plan output feeds Itinerary, Places, Budget & Expenses, Packing. Editor: reorder, remove, add
  place, regenerate a day. Photos lazy loaded and cached.
- Acceptance: user can generate, edit, and reload a plan; existing tabs still work.

### Phase 5: Featured guides (optional) — branch `feat/featured-guides`
- YouTube Data API search per destination with strict caching and a daily cap, plus a small
  curated list (Wikivoyage and a few maintainer-approved links).
- Show only title, thumbnail, link. Never copy blog or video text. No open-web scraping.
- Acceptance: missing key or API failure renders nothing and logs a warning.

### Phase 6: Optional AI (bring your own free key) — branch `feat/ai-assistant`
- Provider interface `generate(prompt, schema)`; Gemini free tier first, swappable (Groq,
  OpenRouter free models, local Ollama). Free-tier limits change, so check the current docs.
- Key stays in the user's browser, never stored on the server. Free tiers may use submitted data
  for model improvement, so send only destination, preferences, and public place data.
- Features: day summaries, tips, "swap this place", chat. Validate output with zod, one retry, then skip.
- Acceptance: with no key the AI UI is hidden; with a bad key or rate limit the plan still works.

---

## 13. Quality, security, observability

**Testing**
- Unit tests for the core; contract tests for adapters using fixtures (no test hits a real API);
  integration test for the job pipeline with all providers mocked; a few UI tests for the form and
  the degraded-state banners. Use the test runner the repo already uses (Vitest or Jest).
- Test cases to include: empty provider results, malformed items, timeouts, duplicate places,
  1-day trip, 14-day trip, tiny budget, unknown destination.

**CI (GitHub Actions)**
```yaml
name: ci
on: [pull_request, push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint --if-present
      - run: npm test --if-present
```
Adapt to the repo's real structure (server/client folders, workspaces).

**Security and privacy**
- `helmet`, rate limit per IP and per user, zod on all inputs, strict CORS to the known frontend.
- No secrets in the client. No user AI key stored server-side. Do not log request bodies with keys.
- Do not send documents, passport numbers, or personal notes to any external API or LLM.
- Respect each API's terms: User-Agent for Nominatim, license and credit for Wikimedia images,
  attribution for Wikivoyage/Wikipedia text and OSM tiles.
- Run `npm audit` and justify every new dependency in the PR description.

**Observability**
- `pino` structured logs with `jobId`, `stage`, `provider`, `durationMs`, `degraded`.
- `/api/health` returns provider status (last success/failure time) and DB connectivity.

---

## 14. Phase kickoff prompts (paste one at a time)

**Phase 0**
> Read this whole guide, then do Phase 0 only. Do not change any source code. Produce
> docs/AUDIT.md as specified and stop.

**Any later phase**
> Do Phase N from the guide on a new branch named as listed. First write a short plan (files you
> will add or change, tests you will add) and wait for my OK. Then implement in small commits,
> run lint and tests, and fix failures. Do not touch unrelated code. Finish with a PR description
> (what changed, how to test, env vars added, screenshots for UI). Do not start Phase N+1.

**Review prompt (after each phase)**
> Review your own diff as a skeptical senior reviewer: edge cases, missing tests, error handling,
> security, accessibility, and anything that could break existing features. List problems and fix them.

---

## 15. Environment variables (document all in `.env.example`)

```
# existing: Google OAuth, OpenTripMap, flights, visa, email, MongoDB ...
NOMINATIM_USER_AGENT=ROSPL/1.0 (contact: you@example.com)
YOUTUBE_API_KEY=            # optional, enables Featured guides
FEATURE_HIGHLIGHTS=false
FEATURE_AI=false
PLANNER_MAX_CONCURRENT_JOBS=3
```
Open-Meteo, Wikipedia/Wikivoyage, Wikimedia, Frankfurter and Nominatim need no keys.
The AI key is entered by the user in the browser and is never an env var.

---

## 16. Definition of done

- "Jaipur, 3 days, 15000 INR, food + history" returns a mapped, day-by-day plan with weather,
  budget split, packing list, and photos, even when every optional service is disabled or failing.
- Saved plans reload identically and never change when APIs change.
- `/api/health` shows provider status; fallbacks are logged, not shown to users as errors.
- Tests and CI pass; no secrets committed; README, `.env.example`, and short ADRs in `docs/adr/` updated.
- Existing ROSPL features still work.

## 17. Stop and ask the user if

- The audit finds a conflict with upstream Travel-Plans conventions.
- An API's current terms, limits, or endpoints differ from this guide or don't allow free use.
- A change would break or rewrite an existing feature.
- A task needs a paid service or a new heavy dependency.
- You are about to make a design decision this guide does not cover.

## 18. Notes to the human maintainer

- Free-tier limits and API terms change. Re-check them before each phase.
- Keep ADRs short: context, decision, consequences. They help reviewers of the upstream PR.
- If the upstream maintainers prefer smaller scope, ship Phases 1 to 4 as the core contribution and
  treat Phases 5 and 6 as follow-ups.
