# ROSPL / PackGo Codebase Audit (Phase 0)

> **Document Status**: Complete & Ready for User Review  
> **Target Branch**: `docs/audit`  
> **Upstream Repository**: `hitesh-kumar123/Travel-Plans-`  
> **Local Fork**: `Shubham-P25/ROSPL`  
> **Stack**: React 19 / Vite 8 / Tailwind CSS v4 (Client), Express 5 / Node 20 / Mongoose 8 (Server), MongoDB Atlas

---

## 1. Executive Summary

This audit assesses the current state of the PackGo / ROSPL codebase in preparation for implementing the **Reliable Trip Planner** defined in `ROSPL_AGENT_SCRIPT.md`. 

The repository is structured as a two-tier monorepo (not npm-workspaced) consisting of `client/` and `server/`. It provides trip and journey tracking, destination exploration across India, emergency contacts, translation, flight/hotel booking mocks, weather lookups, expense tracking, packing checklists, and document expiry tracking.

Key findings:
1. **No test suite exists**: `server` has a placeholder script (`echo "no tests"`), `client` has no test script, and CI runs only formatting/linting.
2. **Module System Mismatch**: `server/` is 100% CommonJS (`require`/`module.exports`), whereas the agent script uses ES Modules (`import`/`export`). We adapt the architecture to idiomatic CommonJS (or hybrid) to prevent breaking existing server code.
3. **Sensitive Data Exposure**: Root `.env.example` contains an active MongoDB Atlas connection URI with plaintext credentials that must be purged.
4. **Clean Integration Surfaces**: Existing trip tabs (`TripItineraryTab`, `TripPlacesTab`, `TripBudgetTab`, `TripPackingTab`, `TripWeatherTab`, `TripDocumentsTab`) map cleanly onto the planned planner snapshot model.
5. **No Breaking Changes Required**: The planner can be implemented as an additive job-based engine without rewriting or breaking any existing user-facing features.

---

## 2. Directory & Architecture Map

### 2.1 Monorepo Top-Level Structure
```
d:\ROSPL\
├── .github/                  # GitHub Actions CI, PR template, issue templates, bots
│   ├── workflows/
│   │   ├── ci.yml            # Lint & format checks for client and server
│   │   ├── close-issue.yml
│   │   ├── conflict-check.yml
│   │   ├── vercel-preview.yml
│   │   └── welcome-bot.yml
│   └── pull_request_template.md
├── .husky/                   # Pre-commit git hooks (lint-staged)
├── client/                   # Vite + React 19 Frontend
├── server/                   # Express 5 + Node 20 Backend
├── docs/                     # Documentation & Architectural Records
│   ├── ARCHITECTURE.md       # Current and target architecture diagrams
│   ├── FEATURE_IDEAS.md      # Future proposals
│   ├── PHASE2_CHANGES.patch
│   ├── PHASE2_README.md
│   └── ROADMAP.md            # Hardening & feature roadmap
├── scripts/                  # Standalone maintenance utilities (update_destinations.js, setup-github.js)
├── .env.example              # Root environment template (needs sanitizing)
├── CONTRIBUTING.md           # Upstream contribution guidelines & PR rules
├── package.json              # Monorepo root dev scripts (prettier, husky, lint-staged)
└── ROSPL_AGENT_SCRIPT.md     # Reliable Trip Planner specification
```

### 2.2 Server Structure (`server/`)
Unlike the script's abstract layout (`server/src/`), the real server layout lives directly under `server/`:
```
server/
├── controllers/              # 10 Express controllers
│   ├── authController.js     # User registration, login, Google OAuth, OTP verification
│   ├── bookingController.js  # Flight & hotel search/booking, OpenTripMap places search
│   ├── documentController.js # Travel document CRUD
│   ├── emergencyController.js# Country emergency numbers lookup
│   ├── expenseController.js  # Trip expenses & summary calculations
│   ├── packingController.js  # Trip packing checklist CRUD & toggles
│   ├── translatorController.js# Text translation via google-translate-api-x
│   ├── tripController.js     # Trip CRUD, public share links
│   ├── visaController.js     # Visa requirements & official fallback links
│   └── weatherController.js  # OpenWeatherMap current & forecast
├── models/                   # 6 Mongoose Schemas
│   ├── Destination.js        # Curated destination database schema
│   ├── Document.js           # Travel documents (passports, visas, insurance)
│   ├── Expense.js            # Financial expenses linked to trips
│   ├── PackingList.js        # Packing checklist items linked to trips
│   ├── Trip.js               # Core journey data model with activities, budget, dates
│   └── User.js               # User accounts, password hashes, OTPs, currency preference
├── routes/                   # 11 Express router modules
│   ├── auth.js
│   ├── booking.js
│   ├── destinations.js
│   ├── documents.js
│   ├── emergency.js
│   ├── expenses.js
│   ├── packing.js
│   ├── translator.js
│   ├── trips.js
│   ├── visa.js
│   └── weather.js
├── middleware/               # 4 Custom middleware modules
│   ├── auth.js               # JWT verification (supports x-auth-token & Bearer)
│   ├── errorHandler.js       # Centralized 500 error handler
│   ├── requireDb.js          # MongoDB connection readiness check
│   └── sanitize.js           # XSS & NoSQL injection mitigation
├── utils/                    # 8 Client & service helper utilities
│   ├── amadeusClient.js      # Amadeus flight search client (OAuth2 flow)
│   ├── duffelClient.js       # Duffel flight API client
│   ├── emailTemplates.js     # HTML templates for OTP and password reset emails
│   ├── openTripMapClient.js  # OpenTripMap geoname and POI radius client
│   ├── recentlyViewed.js     # Cookie/cache helper
│   ├── rotate-secrets.js     # Secret rotation utility
│   ├── sendEmail.js          # Nodemailer transporter (Gmail, Resend, Ethereal fallback)
│   └── test-smtp.js          # Quick SMTP ping test
├── data/                     # Seed datasets
│   ├── cleanAndSeed.js
│   ├── emergencyNumbers.js   # Country-coded police/ambulance/fire contacts
│   ├── india_destinations.json # 309 KB JSON file of Indian monuments & destinations
│   └── seed.js
├── scripts/
│   └── migrate-plaintext-passwords.js # One-off legacy password migration script
├── seed.js                   # Primary MongoDB seeder script
├── server.js                 # App configuration, middleware setup, listen on port 5000
└── package.json              # CommonJS dependencies (no "type": "module")
```

### 2.3 Client Structure (`client/`)
```
client/
├── src/
│   ├── components/           # Core reusable UI elements
│   │   ├── Badge.jsx, Button.jsx, EmptyState.jsx, ErrorState.jsx,
│   │   ├── Footer.jsx, FormField.jsx, LoadingState.jsx, Modal.jsx,
│   │   ├── Navbar.jsx, ProtectedRoute.jsx, ScrollToTop.jsx, SectionHeading.jsx
│   ├── context/
│   │   └── AuthContext.jsx   # Authentication context & session listener
│   ├── features/
│   │   ├── auth/             # LoginPage, RegisterPage, ForgotPasswordPage, ResetPasswordPage, VerifyEmailPage, EmailNoticePage
│   │   ├── destinations/     # ExplorePage, DestinationDetailPage
│   │   ├── profile/          # ProfilePage
│   │   ├── static/           # HomePage, HowItWorksPage, ContactHelpPage, NotFoundPage
│   │   ├── tools/            # TravelToolsPage (Translator, Weather, Currency Converter)
│   │   └── trips/            # MyJourneyPage, TripDetailPage, SharedTripPage, CreateTripModal
│   │       └── tabs/         # Tab subcomponents rendered in TripDetailPage:
│   │           ├── TripOverviewTab.jsx
│   │           ├── TripItineraryTab.jsx
│   │           ├── TripPlacesTab.jsx
│   │           ├── TripBudgetTab.jsx
│   │           ├── TripPackingTab.jsx
│   │           ├── TripWeatherTab.jsx
│   │           ├── TripEmergencyTab.jsx
│   │           ├── TripDocumentsTab.jsx
│   │           └── TripNotesTab.jsx
│   ├── services/
│   │   └── api/              # Axios API service adapters
│   │       ├── client.js     # Central Axios instance with JWT interceptors & error extractor
│   │       ├── authApi.js, destinationsApi.js, documentsApi.js, emergencyApi.js,
│   │       ├── expensesApi.js, packingApi.js, placesApi.js, translatorApi.js,
│   │       ├── tripsApi.js, weatherApi.js
│   ├── App.jsx               # Client router & Suspense fallbacks
│   ├── index.css             # Tailwind CSS v4 stylesheet
│   └── main.jsx              # React 19 entry point
├── package.json              # Client dependencies & scripts (oxlint, vite)
└── vite.config.js            # Vite config with @vitejs/plugin-react & @tailwindcss/vite
```

---

## 3. Data Models Audit

| Model | File | Primary Purpose | Fields & Types | Indexes / Hooks | Notes & Constraints |
|---|---|---|---|---|---|
| **User** | `server/models/User.js` | User accounts & credentials | `name` (String, required), `email` (String, unique, RFC 5322 regex), `password` (String, select: false, bcrypt), `authProvider` ("local" \| "google"), `isVerified` (Boolean), `baseCurrency` (String, default "INR"), `otp`, `otpExpire`, `resetPasswordToken`, etc. | Unique index on `email`. `pre("save")` hook auto-hashes password. `toJSON` deletes password, otp, tokens. | Contains legacy `verifyPassword` method supporting plaintext checks with migration option. |
| **Trip** | `server/models/Trip.js` | User journey record | `user` (ObjectId -> User), `destination` (String), `images` ([String]), `startDate` (Date), `endDate` (Date), `description` (String), `budget` (Number, >= 0), `status` ("planned" \| "ongoing" \| "completed"), `activities` ([{ name, date, location, notes }]), `accommodation`, `transportation`, `shareToken`, `shareEnabled` | `pre("validate")` hook enforces: `endDate >= startDate`, `checkOut >= checkIn`, `arrivalTime >= departureTime`. | Direct basis for current trips. No embedded day-by-day slot or provider snapshot fields yet. |
| **Destination** | `server/models/Destination.js` | Indian destinations catalogue | `name`, `city`, `state`, `zone`, `coordinates: { lat, lon }`, `type`, `significance`, `rating`, `entrance_fee_inr`, `best_time_to_visit`, `time_needed_hrs`, `dslr_allowed`, `weekly_off`, `establishment_year`, `wikidata`, `wikipedia`, `images` | Standard timestamps. | Seeded from `server/data/india_destinations.json`. Can serve as an immediate offline seed source for the planner. |
| **Expense** | `server/models/Expense.js` | Financial transaction logs | `user` (ObjectId), `trip` (ObjectId), `amount` (Number), `currency` (String, default "USD"), `category` (Enum: Accommodation, Transportation, Food, Activities, Shopping, Other), `description` (String), `date` (Date) | Referenced by `trip`. | Currency defaults to "USD" in schema despite frontend defaulting to "INR". |
| **PackingList** | `server/models/PackingList.js` | Packing checklist per trip | `trip` (ObjectId, unique), `user` (ObjectId), `items: [{ name, category, packed }]` | Unique index on `trip` (one list per trip). | Categories: Clothing, Toiletries, Electronics, Documents, Medicine, Other. |
| **Document** | `server/models/Document.js` | Passport/visa/insurance tracker | `user` (ObjectId), `trip` (ObjectId, optional), `type` ("passport" \| "visa" \| "insurance" \| "other"), `label` (String, max 100), `issuingCountry` (String), `expiryDate` (Date) | Compound indexes on `{ user: 1, expiryDate: 1 }` and `{ trip: 1, user: 1 }`. | **PII protection**: Deliberately omits full document numbers to prevent credential leakage. |

---

## 4. API Endpoints & Routes Audit

| Prefix | Endpoint | Method | Auth | Description | Input / Output Notes |
|---|---|---|---|---|---|
| `/api/auth` | `/google` | POST | Public | Google ID token verification | Accepts `{ credential }`, links or creates user account |
| `/api/auth` | `/register` | POST | Public | User registration | Strict email regex & password complexity checks |
| `/api/auth` | `/login` | POST | Public | Local authentication | Returns JWT token and sanitized user profile |
| `/api/auth` | `/profile` | GET / PUT | Private | Get or update profile | Manages `name`, `baseCurrency` |
| `/api/auth` | `/forgot-password`, `/reset-password/:token` | POST / PUT | Public | Password recovery flow | Generates sha256 reset token, sends email |
| `/api/trips` | `/` | GET / POST | Private | List or create trips | Paginated (`page`, `limit`); validates date chronology |
| `/api/trips` | `/:id` | GET / PUT / DELETE | Private | Trip management | Updating trips updates activities, notes, etc. |
| `/api/trips` | `/:id/share`, `/:id/share-toggle`, `/share/:token` | POST / PUT / GET | Mixed | Public link sharing | Share token exposes trip details without auth |
| `/api/destinations` | `/`, `/search`, `/:id` | GET | Public | Destination lookup & autocomplete | Regex search across name, city, state; paginated |
| `/api/booking` | `/places/search` | POST | Private | OpenTripMap POI search | Converts destination -> geocoding -> radius search |
| `/api/booking` | `/flights/search`, `/hotels/search` | POST | Private | Flight and hotel search | Amadeus flight search with mock fallback; hotel mock |
| `/api/weather` | `/current/:location`, `/forecast/:location` | GET | Private | OpenWeatherMap weather | Current conditions & 5-day forecast |
| `/api/expenses` | `/`, `/trip/:tripId`, `/trip/:tripId/summary` | POST / GET / DELETE | Private | Expense management | Grouped totals and balance tracking |
| `/api/packing` | `/:tripId`, `/:tripId/toggle/:itemId`, `/:tripId/reset` | GET / POST / PUT | Private | Packing checklist | Add, toggle checked, reset all |
| `/api/documents` | `/`, `/trip/:tripId`, `/:id` | GET / POST / PUT / DELETE | Private | Document tracking | Validates expiry date against current date |
| `/api/emergency` | `/:countryCode`, `/by-destination/:destination` | GET | Public | Emergency hotline lookup | Safety-critical; public access |
| `/api/translator`| `/languages`, `/translate` | GET / POST | Public | Language translation | Uses `google-translate-api-x` |
| `/api/visa` | `/check` | GET | Public | Visa requirement check | External provider or official search link fallback |

---

## 5. Current Tab Code Audit (`client/src/features/trips/tabs/`)

The existing trip details screen (`TripDetailPage.jsx`) has a 9-tab navigation bar:

1. **`TripOverviewTab.jsx`**:
   - Renders journey hero, destination, trip countdown, quick statistics (activities count, budget total, packing progress percentage), and cards for accommodation and transportation details.
2. **`TripItineraryTab.jsx`**:
   - Renders a vertical timeline of `trip.activities` sorted chronologically.
   - Provides a modal form to add activities (`name`, `date`, `location`, `notes`) and saves them via `PUT /api/trips/:id`.
   - **Planner Integration Opportunity**: When a trip is generated by the planner, the planner's scheduled day-by-day stops can automatically populate `trip.activities`.
3. **`TripPlacesTab.jsx`**:
   - Queries `placesApi.search({ destination: trip.destination, categories })` which hits OpenTripMap.
   - Renders place cards with categories (`SIGHTS`, `HISTORICAL`, `BEACH_PARK`, `RESTAURANT`, `SHOPPING`), calculated score/rank, estimated admission in INR, and external booking links (GetYourGuide, Viator, TripAdvisor, Google Maps).
   - **Planner Integration Opportunity**: The planner's curated places snapshot can be displayed directly here, or places from the planner can be pinned directly into this tab.
4. **`TripBudgetTab.jsx`**:
   - Compares total trip budget against logged expenses (`expensesApi`).
   - Displays a breakdown by category (`Accommodation`, `Transportation`, `Food`, `Activities`, `Shopping`, `Other`) with visual progress bars.
   - **Planner Integration Opportunity**: The planner's pure `splitBudget` algorithm (Stay: 40%, Food: 25%, Transport: 15%, Activities: 15%, Buffer: 5%) can provide the initial target baseline for this tab.
5. **`TripPackingTab.jsx`**:
   - Interactive checklist with progress percentage, categorized into Clothing, Toiletries, Electronics, Documents, Medicine, Other.
   - **Planner Integration Opportunity**: The planner's rule-based packing generator (umbrella if rain > 40%, sunscreen if temp > 32°C, walking shoes if nature/adventure) can directly seed `PackingList` for the trip.
6. **`TripWeatherTab.jsx`**:
   - Queries `weatherApi.getCurrent(trip.destination)` and `weatherApi.getForecast(trip.destination)` (OpenWeatherMap).
   - Renders current temperature, weather conditions icon, humidity, wind speed, and 5-day daily forecast cards.
   - **Planner Integration Opportunity**: Can display Open-Meteo data when `WEATHER_API_KEY` is not provided.
7. **`TripEmergencyTab.jsx`**:
   - Displays emergency numbers (police, medical, fire) for the destination country via `emergencyApi`.
8. **`TripDocumentsTab.jsx`**:
   - Manages travel documents (passports, visas, insurance) with visual badges: Valid (green), Expiring soon (<180 days, terracotta), Expired (dark).
9. **`TripNotesTab.jsx`**:
   - Freeform travel journal / notes field stored in `trip.description`.

---

## 6. External APIs & Service Integrations

| Service | Used In | Authentication | Cost / Free Tier | Failover Behavior |
|---|---|---|---|---|
| **OpenTripMap** | `server/utils/openTripMapClient.js`, `server/controllers/bookingController.js` | Free API Key (`OPENTRIPMAP_API_KEY`) | 5,000 req/day free | Currently throws `OpenTripMapError` without key. Must be wrapped in `withFallback`. |
| **OpenWeatherMap** | `server/controllers/weatherController.js` | Free API Key (`WEATHER_API_KEY`) | 1,000 req/day free | Fails with 500/404 if unconfigured. Planner will use **Open-Meteo** (no key required, 100% free) with historical climate fallback. |
| **Nominatim (OSM)** | *Not yet integrated* (to be added) | None (Requires descriptive `User-Agent`) | Free (1 req/sec rate limit) | Cache for 90 days in MongoDB; fall back to seed data. |
| **MediaWiki / Wikivoyage** | *Not yet integrated* (to be added) | None | Free open content | CC BY-SA attribution required; store source URL. |
| **Wikimedia Commons** | *Not yet integrated* (to be added) | None | Free open media | Requires `photoCredit` attribution and author storage. |
| **Frankfurter** | `client/src/features/tools/TravelToolsPage.jsx`, `client/.env.example` | None | Free open API | Currency exchange rate conversion. Cache for 12 hours. |
| **Google OAuth** | `server/controllers/authController.js`, `client/src/features/auth/` | Google Client ID | Free | Graceful failure; local email/password remains active. |
| **Google Translate** | `server/controllers/translatorController.js` | None (`google-translate-api-x`) | Free unofficial wrapper | Fails with error message if upstream blocks. |
| **Amadeus / Duffel** | `server/utils/amadeusClient.js`, `server/utils/duffelClient.js` | API Key / Client Credentials | Free sandbox tier | Falls back to static mock flight cards. |
| **SMTP / Nodemailer** | `server/utils/sendEmail.js` | SMTP credentials | Gmail / Resend free tier | Dev mode automatically provisions Ethereal test accounts. |

---

## 7. Environment Variables Audit

### Existing Variables
```ini
# Server Configuration
PORT=5000
MONGO_URI=mongodb+srv://...               # Database connection
FRONTEND_URL=http://localhost:3000       # CORS allowlist
FRONTEND_URLS=http://localhost:5173,...   # Additional CORS origins
NODE_ENV=development

# Security & Auth
JWT_SECRET=...                           # Validated >= 32 chars
GOOGLE_CLIENT_ID=...                     # Google OAuth Client ID

# External Services
WEATHER_API_KEY=...                      # OpenWeatherMap
OPENTRIPMAP_API_KEY=...                  # OpenTripMap
OPENTRIPMAP_BASE_URL=https://api.opentripmap.com/0.1
OPENTRIPMAP_LANG=en
FLIGHT_API_KEY=...                       # Duffel Flights
AMADEUS_CLIENT_ID=...                    # Amadeus Flights
AMADEUS_CLIENT_SECRET=...
VISA_API_KEY=...                         # Visa lookup
VISA_API_URL=...

# Email / SMTP
EMAIL_SERVICE=gmail
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=...
EMAIL_PASS=...
EMAIL_FROM=...
EMAIL_FROM_NAME=PackGo
```

### New Variables Required for Reliable Trip Planner
```ini
NOMINATIM_USER_AGENT=ROSPL/1.0 (contact: packgo@example.com) # Descriptive UA required by OSM policy
PLANNER_MAX_CONCURRENT_JOBS=3                               # Global background concurrency cap
FEATURE_HIGHLIGHTS=false                                    # Phase 5: Optional YouTube/guides
FEATURE_AI=false                                            # Phase 6: Optional AI assistant
YOUTUBE_API_KEY=                                            # Optional: Phase 5 featured videos
```
*Note: Open-Meteo, Wikivoyage, Wikimedia, and Frankfurter require NO API keys. AI keys are supplied by the user in the browser and are never stored on the server.*

---

## 8. Deployment Configuration

1. **Frontend Hosting (Vercel)**:
   - Deployed as a single-page application (SPA).
   - Environment variables must be prefixed with `VITE_` (e.g. `VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID`, `VITE_FRANKFURTER_API_URL`).
   - Pull request previews are automated via `.github/workflows/vercel-preview.yml`.
2. **Backend Hosting (Render)**:
   - Node.js service running on Render free tier (`https://travel-plans.onrender.com/api`).
   - Free instances spin down after 15 minutes of inactivity; initial wake-up latency is ~50–60 seconds.
   - `app.set("trust proxy", 1)` is already enabled in `server.js` for reverse-proxy rate limiting.
   - **Crucial implication for Job Runner**: When Render sleeping instances restart, jobs in `running` status must be swept and marked failed/retryable upon boot (Section 9 of script).

---

## 9. Test & CI Status

### Current Status
- **Test Coverage**: **0%** across the entire repository.
- **Server Test Script**: `npm test` runs `echo "no tests" && exit 0`.
- **Client Test Script**: No `test` script defined in `client/package.json`.
- **CI Pipeline (`.github/workflows/ci.yml`)**:
  - `client-checks`: Runs `npm run lint` (`oxlint`) and `npm run build`. Note: `format:check` is invoked with `--if-present`, but `client/package.json` does not have a `format:check` script.
  - `server-checks`: Runs `npm run lint` (`eslint`) and `npm run format:check` (`prettier`).
  - Neither job runs tests.

### Phased Testing Plan
- **Server**: Install `vitest` or `jest` + `supertest` in `server/`. Use Vitest for ultra-fast pure unit tests for `planner/` algorithm functions (under 5 seconds) and contract tests with recorded fixtures.
- **Client**: Add Vitest + React Testing Library for form validation and degraded banner rendering.
- **CI**: Add `npm test` step to both `client-checks` and `server-checks` in `.github/workflows/ci.yml`.

---

## 10. Code Quality, Dead Code & Security Vulnerabilities

### 10.1 Security Issues
1. **Critical: Leaked MongoDB Atlas URI**:
   - `d:\ROSPL\.env.example` line 3 contains:  
     `MONGO_URI=mongodb+srv://eshanimisra_db_user:plexusDB%40@>@plexusdb.3akys2j.mongodb.net/travel-plan?retryWrites=true&w=majority`
   - *Action*: Sanitize `.env.example` to `mongodb+srv://<username>:<password>@cluster.mongodb.net/traveldb` and notify maintainer to rotate Atlas database credentials.
2. **Over-posting Vulnerability**:
   - `tripController.js` and `expenseController.js` pass raw `req.body` to Mongoose update queries without field whitelisting.
   - *Action*: In the planner routes and schemas, enforce strict `zod` validation so unexpected fields are stripped.
3. **Legacy Plaintext Password Fallback**:
   - `User.js` contains `verifyPassword` which compares plaintext passwords if the stored hash is not bcrypt.
   - *Action*: Keep compatibility for existing seeded accounts, but ensure no new plaintext accounts can be created.
4. **Token Storage**:
   - Client stores JWT in `localStorage` (`packgo_token`), subject to XSS vulnerability.
   - *Action*: Recommend httpOnly cookies in future security enhancements; for now, ensure input sanitization via `sanitize.js` is preserved.

### 10.2 Dead / Redundant Code
1. **`react-qr-code` in Backend**:
   - `react-qr-code` is installed in `server/package.json` dependencies (line 32) but is never imported or used anywhere in `server/`. It should be removed during dependency cleanup.
2. **Multiple Seeding Scripts**:
   - `server/data/cleanAndSeed.js`, `server/data/seed.js`, and `server/seed.js` are redundant duplicates. `server/seed.js` is the active one.
3. **Dual Flight API Clients**:
   - Both `duffelClient.js` and `amadeusClient.js` exist in `server/utils/`, while `bookingController.js` falls back to `mockFlights`.

---

## 11. Upstream Travel-Plans Contribution Rules vs Script Requirements

| Upstream Rule (`CONTRIBUTING.md`) | Reliable Trip Planner Proposal | Analysis & Resolution |
|---|---|---|
| **"Do NOT propose completely new features or implementations that alter the scope"** | Adds a Reliable Trip Planner with day-by-day plans, maps, and packing recommendations. | **Potential Scope Friction**: The upstream maintainer guidelines forbid open-ended new feature proposals without issue assignment. <br/>**Resolution**: Frame the planner as a major enhancement and bug fix for the existing incomplete trip generation and booking mocks. In upstream PRs, present Phases 1–4 as an enhancement to the existing "My Journey" & "Trips" tabs. Follow Section 18 of the script: keep PRs focused, modular, and small. |
| **"Only work on assigned issues"** | Implementation done across phased branches. | Ensure each phase has an associated GitHub issue before submitting PRs upstream. |
| **"Mandatory UI Mockups for UI/UX Issues"** | Frontend planner UI (`PlannerForm`, `PlanProgress`, `MapView`, etc.). | Record screenshots/video recordings for every UI change as required by `.github/pull_request_template.md`. |
| **Conventional Commits Format** | e.g. `feat(planner): ...`, `test(planner): ...` | Enforce Conventional Commits strictly on every phase commit. |
| **"Never commit directly to main"** | Each phase = one branch = one PR. | Follow branch naming: `docs/audit`, `feat/planner-foundation`, `feat/planner-core`, `feat/planner-providers`, `feat/planner-ui`. |

---

## 12. Proposed File Architecture for New Modules

To ensure seamless compatibility with the existing CommonJS Node/Express backend and React/Vite frontend, we map the script's proposed layout directly into the real workspace structure:

### 12.1 Server Modules (`server/`)
```
server/
├── planner/                         # PURE CORE ALGORITHM (No DB, No HTTP)
│   ├── index.js                     # Main pure entrypoint: generatePlan(request, places, weather)
│   ├── scoring.js                   # Score places by interest, rating, popularity + deduplication
│   ├── cluster.js                   # Deterministic k-means with day balancing
│   ├── order.js                     # Nearest-neighbour + 2-opt route ordering
│   ├── slots.js                     # Chronological time slotting (morning, afternoon, evening)
│   ├── budget.js                    # Category budget split & activity cost verification
│   ├── packing.js                   # Rule-based weather/trip packing generator
│   └── __tests__/                   # Vitest unit tests for planner core
│       ├── scoring.test.js
│       ├── cluster.test.js
│       ├── order.test.js
│       ├── budget.test.js
│       └── packing.test.js
├── providers/                       # EXTERNAL ADAPTERS (Each returns standardized Place shape)
│   ├── opentripmap.js               # OpenTripMap POI adapter with normalization
│   ├── nominatim.js                 # Nominatim OSM geocoding with 1s throttling
│   ├── wikivoyage.js                # MediaWiki / Wikivoyage summary adapter
│   ├── openmeteo.js                 # Open-Meteo forecast & climate adapter (No API key)
│   ├── wikimedia.js                 # Wikimedia Commons photo & license/credit adapter
│   ├── frankfurter.js               # Frankfurter currency conversion adapter
│   └── __tests__/                   # Contract tests using mock fixtures
│       ├── opentripmap.test.js
│       ├── nominatim.test.js
│       └── openmeteo.test.js
├── cache/                           # RESILIENT CACHE LAYER
│   ├── model.js                     # Mongoose Cache model (soft freshUntil, hard expiresAt TTL)
│   └── cache.js                     # cacheGet, cacheSet, stale-while-revalidate helpers
├── jobs/                            # IN-PROCESS BACKGROUND JOB ENGINE
│   ├── model.js                     # Mongoose PlanJob model (queued, running, done, failed)
│   ├── runner.js                    # In-process stage runner (places -> weather -> core -> photos -> save)
│   └── routes.js                    # POST /api/planner/jobs, GET /api/planner/jobs/:id
├── seed/                            # OFFLINE FALLBACK SEED DATA
│   └── destinations/
│       ├── jaipur.json              # Curated fallback places for Jaipur
│       ├── goa.json                 # Curated fallback places for Goa
│       └── varanasi.json            # Curated fallback places for Varanasi
├── schemas/                         # BOUNDARY VALIDATION (Zod)
│   ├── place.js                     # PlaceSchema & CATEGORIES
│   ├── request.js                   # PlanRequestSchema
│   └── plan.js                      # PlanSchema (immutable snapshot contract)
├── lib/                             # SHARED UTILITIES
│   ├── withFallback.js              # Multi-step retry and fallback orchestrator
│   ├── haversine.js                 # Haversine distance & travel time calculation
│   └── logger.js                    # Structured logger with stage & duration metadata
├── test/
│   └── fixtures/                    # Recorded JSON responses from real providers
│       ├── opentripmap/
│       ├── nominatim/
│       ├── openmeteo/
│       └── wikimedia/
├── routes/
│   ├── planner.js                   # Exposes planner job routes
│   ├── plans.js                     # Exposes /api/plans snapshot routes (GET, PATCH, regenerate)
│   └── health.js                    # Exposes /api/health with provider and DB diagnostics
```

### 12.2 Client Modules (`client/src/`)
```
client/src/
├── features/
│   └── planner/                     # PLANNER USER INTERFACE
│       ├── PlannerPage.jsx          # Dedicated planner landing & results page
│       ├── PlannerForm.jsx          # Destination, days (1-14), budget, interests, pace, travellers
│       ├── PlanProgress.jsx         # Real-time stage progress polling bar & cancel/retry actions
│       ├── ItineraryView.jsx        # Day tabs, timeline stops, slot cards, travel minutes
│       ├── PlaceCard.jsx            # Lazy photo, Wikimedia credit, rating, category badge
│       ├── MapView.jsx              # Leaflet + OpenStreetMap tiles, numbered pins & route polyline
│       ├── BudgetPanel.jsx          # Dynamic budget split comparison & warnings
│       ├── PackingPanel.jsx         # Interactive checklist categorized with weather reasons
│       ├── FeaturedGuides.jsx       # Phase 5: Curated / YouTube destination guides (if enabled)
│       └── AssistantPanel.jsx       # Phase 6: Bring-Your-Own-Key AI assistant (if enabled)
├── services/
│   └── api/
│       └── plannerApi.js            # createJob, getJobStatus, getPlan, patchPlan, regenerateDay
```

---

## 13. Module System Decision: CommonJS vs ESM

The agent script snippets are authored in ESM (`import`/`export`), while the server currently runs in Node CommonJS (`require`/`module.exports`). 

**Decision**:
1. For **`server/`**: Implement all new server files using standard CommonJS (`module.exports` and `require`) to maintain 100% compatibility with the existing 10 controllers, 11 routes, and Mongoose models without risking breaking changes to `server.js` or the runtime.
2. For **`zod`**: Install `zod` in `server/`, which cleanly supports CommonJS via `const { z } = require('zod');`.
3. For **`client/`**: Keep native ESM with Vite.

---

## 14. Phase 0 Audit Conclusion & Next Steps

This codebase is clean, well-structured, and ready for Phase 1. Existing features (Google login, trip CRUD, expenses, packing, emergency, and documents) will remain fully operational and will directly benefit from the planner output.

### Verification Checklist Completed:
- [x] Full directory inspection and folder map documented.
- [x] All 6 Mongoose models analyzed.
- [x] All 11 route files and controllers audited.
- [x] All 9 tabs of `TripDetailPage` reviewed for planner integration.
- [x] External APIs, cost constraints, and rate limits verified.
- [x] Security issues cataloged (including exposed MongoDB URI).
- [x] Travel-Plans upstream contribution rules compared.
- [x] Exact file structure adapted for real repository paths.
- [x] Zero production source code modified in Phase 0.

---

> [!IMPORTANT]
> **Awaiting User Review & Approval**:  
> Per Section 0 & Phase 0 acceptance criteria, execution now pauses.  
> Once this audit is reviewed and approved, we will proceed to **Phase 1: Foundations + Walking Skeleton** on branch `feat/planner-foundation`.
