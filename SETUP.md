# Running this project in VS Code

## 1. Open the project
Open this whole folder (`Travel-Plans-`) in VS Code — not just `client/` or
`server/` individually — so the `.vscode/` settings and tasks below work.
`File > Open Folder...` and select this folder.

VS Code will prompt you to install the recommended extensions
(`.vscode/extensions.json`: ESLint, Prettier, Tailwind CSS IntelliSense,
Oxlint, MongoDB) — accept that prompt, or install them manually later.

## 2. Prerequisites
- **Node.js 18+** (the backend uses Express 5 and Mongoose 8, both of which
  expect a reasonably current Node — there's no `engines` field pinning a
  version, but older Node LTS versions aren't tested against this stack).
- **MongoDB** — either a local instance, or a free
  [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (get a
  connection string either way).

## 3. Install dependencies
Two separate installs — this repo has no root-level `npm install` that
covers both:

```bash
cd server && npm install
cd ../client && npm install
```

## 4. Configure environment variables
Both `server/` and `client/` have a `.env.example` — copy each to `.env` in
the same folder and fill in real values:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

**Required to run at all:** `MONGO_URI` (your MongoDB connection string) and
`JWT_SECRET` in `server/.env` — note `JWT_SECRET` must be **at least 32
characters** (the server validates this at startup and crashes immediately
if it's shorter, confirmed by testing).

**Optional — the app degrades gracefully without these, not crashes:**
- `WEATHER_API_KEY` — weather tab falls back to no data if unset.
- `VISA_API_KEY` / `VISA_API_URL` — visa checker returns an honest
  "not configured" response with an official-lookup link if unset
  (see `docs/PHASE2_README.md` for why this one has no live data by
  default).
- `FLIGHT_API_KEY` — flight search uses Duffel API (falls back
  to labeled sample data if unset).
- `EMAIL_USER` / `EMAIL_PASS` — needed for password-reset/verification
  emails to actually send; without them the app still runs, those emails
  just won't deliver.

## 5. Run it

**Option A — VS Code tasks (already set up in `.vscode/tasks.json`):**
`Terminal > Run Task... > Run Both (server + client)` — starts both dev
servers in separate integrated terminal panels.

**Option B — two manual terminals:**
```bash
# Terminal 1
cd server && npm run dev      # nodemon, http://localhost:5000 by default

# Terminal 2
cd client && npm run dev      # Vite, http://localhost:5173 by default
```

## 6. Verify it's working
- Backend: visiting `http://localhost:5000` (or whatever `PORT` you set)
  should respond, not connection-refused.
- Frontend: `http://localhost:5173` should load the PackGo landing page.
- Check the server terminal for `Connected to MongoDB` — if that's missing
  or errors, double check `MONGO_URI`.

## What to read next
- `docs/ARCHITECTURE.md` — how the pieces fit together, current vs. proposed
- `docs/ROADMAP.md` — suggested build order for what's not done yet
- `docs/FEATURE_IDEAS.md` — feature ideas beyond what's implemented
- `docs/PHASE2_README.md` — exactly what's tested vs. not in the most
  recently added features (documents tracker, Amadeus flight search)
