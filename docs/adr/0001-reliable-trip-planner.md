# ADR 0001: Reliable Open-Source $0 Trip Planner Architecture

## Status
Accepted

## Context
Upstream travel planners and the original PackGo codebase suffered from multiple structural vulnerabilities:
1. **Unreliable Scrapers & Flaky Endpoints**: Previous attempts to gather travel itineraries depended on brittle DOM scrapers or unmaintained third-party proxies that broke whenever target sites modified layouts or instituted bot detection (HTTP 403 / Cloudflare).
2. **Paid API Key Exclusions**: Proprietary APIs (Google Maps Platform, OpenAI, Skyscanner) require active credit cards and incur ongoing usage bills. For an open-source educational project, forcing users or evaluators to provision and fund credit card-backed API keys makes the software unrunnable for the vast majority of users.
3. **Black-Box LLM Hallucinations**: Prompting remote LLMs directly to generate entire travel schedules frequently produced non-existent venues, physically impossible geographic routes (e.g. crossing a city 4 times in 2 hours), and zero guarantees of budget or pace constraints.
4. **Fragility on Boot**: If network connections were severed or external provider quotas were exhausted, trip creation would fail completely with blank screens or 500 errors.

## Decision
We architected a multi-layered, resilient, $0 open-source planner engine:
1. **Separation of Planning Core from Data Providers**:
   - The planner core (`server/planner/`) is 100% pure JavaScript with zero external HTTP dependencies.
   - It performs deterministic candidate scoring (`scoring.js`), geographic k-means clustering (`cluster.js`), 2-opt nearest-neighbor TSP tour ordering (`order.js`), time-slot allocation (`slots.js`), budget distribution (`budget.js`), and contextual packing list synthesis (`packing.js`).
2. **Resilient Open-Source Provider Chain with Automatic Fallbacks**:
   - **Geocoding**: OpenStreetMap Nominatim (throttled to 1 req/sec with 90-day caching) with seed coordinates fallback.
   - **Places**: OpenTripMap with fallback to curated high-density seed packs (`jaipur.json`, `goa.json`, `varanasi.json`).
   - **Weather**: Open-Meteo (free open-source weather forecast API, no key required).
   - **Guide Content**: MediaWiki REST API (Wikivoyage CC BY-SA 4.0 summaries).
   - **Visuals**: Wikimedia Commons API with full CC BY-SA license and author attribution parsed and displayed.
   - **Currency**: Frankfurter API (open-source European Central Bank rates) with offline static rates table fallback.
3. **Asynchronous Multi-Stage Background Job Engine**:
   - Long-running data lookups execute in background jobs (`server/jobs/runner.js`) with progress stages: `places -> weather -> planning -> photos -> saving`.
   - On server reboot, any jobs stuck in `running` for > 2 minutes are automatically swept.
4. **Client-Side Bring-Your-Own-Key (BYOK) AI Assistant**:
   - Optional AI concierge powered by Google Gemini (free tier) or Groq directly in the user's browser.
   - **Strict Privacy**: The user's API key is stored exclusively in browser `localStorage` and is never sent to, proxied by, or logged on the PackGo backend.
5. **Seamless PackGo Journey Synchronization**:
   - Saved plan snapshots can be directly converted into PackGo's existing `Trip`, `PackingList`, and `Expense` records (`POST /api/plans/:id/convert-to-trip`), giving users interactive timeline management, expense tracking, and collaboration.

## Consequences
### Positive
- **$0 Running Cost**: Zero paid API keys, credit cards, or operational bills required to run the full application.
- **Offline & Fallback Resilience**: The planner generates complete, high-quality itineraries even when all external networks are completely disconnected.
- **Fast Execution & Verification**: Pure algorithm test suite runs 53 tests across 10 suites in under 2 seconds.
- **Compliance & Attribution**: Full CC BY-SA 4.0 attribution is tracked for all text and photography assets.
- **Backward Compatibility**: Fully preserves PackGo's existing authentication, trip management, and travel tools.

### Negative / Trade-Offs
- Free external endpoints (Nominatim, OpenTripMap) require polite rate limits (1 req/sec) and caching to avoid rate-limiting.
- Unseeded remote destinations outside major geographic areas receive seed fallback recommendations if live place queries return fewer than 3 venues.
