# Contributing to PackGo (Travel Planner)

Thank you for your interest in contributing to PackGo! We welcome contributions from everyone during GSSoC and the open-source community.

---

## 🎯 Contribution Scope & Issue Creation Guidelines

> [!IMPORTANT]
> **Please read these rules carefully before opening an issue or Pull Request.**

### 1. Focus on Existing Features & Bug Fixes Only

- **Do NOT propose completely new features** or implementations that alter the scope of this project.
- **Find and fix bugs**, improve performance, resolve edge-cases, enhance responsiveness, or refine existing UI/UX elements.
- Ensure any proposed changes align directly with the existing architecture and design system.

### 2. Mandatory UI Mockups for UI/UX Issues

- If you are opening an issue related to **UI/UX improvements**, you **MUST attach a clear UI Mockup, Figma/design reference, screenshot, or video** illustrating your proposed change.
- **Issues without UI mockups / visual references will NOT be assigned.**
- The proposed improvement must be crystal clear to the maintainer/admin before work begins.

---

## ⚠️ Contributor Rules

- Only work on **assigned issues** — comment on the issue and wait for formal assignment before starting.
- **No trivial changes** — whitespace modifications, typo fixes in code comments, or cosmetic README tweaks will not be accepted.
- **Respond to PR reviews within 48 hours**, or the PR may be closed/reassigned.
- **Never commit directly to `main`** — always create a dedicated feature branch on your fork.

---

## 🤖 AI Conduct

- You **may use AI tools** (Copilot, ChatGPT, Claude) to understand concepts or debug code.
- You **must fully understand** every line you submit — reviewers will ask technical questions.
- **Cite AI assistance** in your PR description if AI substantially helped.
- **No unverified copy-pasting** of AI output without manual testing.
- **No AI-generated bot comments** on issues or PRs.

---

## 🚀 Contribution Workflow

1. **Fork the repository** to your GitHub account.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/<your-username>/Travel-Plans-.git
   cd Travel-Plans-
   ```
3. **Sync with upstream `main`**:
   ```bash
   git remote add upstream https://github.com/hitesh-kumar123/Travel-Plans-.git
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```
4. **Create a feature branch**:
   ```bash
   git checkout -b fix/your-bug-fix
   # or
   git checkout -b improve/your-ui-improvement
   ```
5. **Make your changes** following code style guidelines.
6. **Test your changes** locally before submitting.
7. **Commit your changes** using Conventional Commits format:
   ```bash
   git commit -m "fix(trips): resolve date picker range error on safari"
   ```
8. **Push your branch & open a Pull Request**:
   ```bash
   git push origin fix/your-bug-fix
   ```

---

## 💻 Local Environment Setup

### 1. Server Setup (`/server`)

```bash
cd server
npm install
```

Create a `.env` file in the `server/` directory:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/traveldb
JWT_SECRET=your_secret_key_here
FRONTEND_URL=http://localhost:5173
```

Start the backend:

```bash
npm run dev
```

### 2. Client Setup (`/client`)

```bash
cd client
npm install
```

Create a `.env` file in the `client/` directory:

```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
VITE_FRANKFURTER_API_URL=https://api.frankfurter.dev/v1
```

Start the frontend:

```bash
npm run dev
```

---

## 📋 Pull Request Requirements

- Clear, descriptive PR title adhering to Conventional Commits.
- Fill out the PR Template completely.
- Reference the linked issue: `Fixes #123` or `Closes #123`.
- **UI changes MUST include Before / After screenshots or video recordings.**
- Ensure all automated checks pass.

---

## 🧪 Testing & Validation

Before submitting your PR, run the automated checks locally:

```bash
# In client/
npm run lint
npm run build

# In server/
npm run lint
npm run format:check

# In root /
npm run format:check
```

- Ensure there are no console errors or warnings when testing locally ✅.

---

## 📝 Commit Message Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix      | Purpose                                   | Example                                              |
| ----------- | ----------------------------------------- | ---------------------------------------------------- |
| `fix:`      | Bug fix                                   | `fix(auth): resolve token refresh loop`              |
| `feat:`     | Approved enhancement to existing feature  | `feat(destinations): add state filter to search`     |
| `style:`    | UI/UX styling or CSS polish               | `style(navbar): improve mobile drawer touch targets` |
| `docs:`     | Documentation update                      | `docs: update contributing issue guidelines`         |
| `refactor:` | Code restructuring without feature change | `refactor(trips): modularize expense calculations`   |
| `test:`     | Adding or fixing test cases               | `test(auth): add unit test for password validation`  |

---

## 🌱 Beginner Contributor Guidance

1. Look for issues labeled [`good first issue`](../../issues?q=label%3A%22good+first+issue%22).
2. Comment on the issue asking to be assigned along with your implementation plan / UI mockup.
3. Wait for the maintainer to assign the issue to you before submitting code.

Thank you for helping make **PackGo** better! 🌟
