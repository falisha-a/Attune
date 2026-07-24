# Attune — Tech stack explained (for you)

This is your plain-language map of **what** Attune is built with, **why** those choices were made, and **how** each piece is actually used in this project. You do not need to memorize it — open it when something confuses you.

If you want “how do I click buttons / run commands,” use **`HOW_TO_USE.md`**.  
If an agent needs product rules, use **`FOR_FUTURE_AGENTS.md`**.

---

## 1. The big idea in one paragraph

Attune is **two programs** on your PC talking over the network on your machine only:

1. The **frontend** draws the screens in the browser.  
2. The **backend** stores your data, does math (cycle phase, calories), and talks to USDA / Gemini when needed.

Your personal data lives in a single file: `backend/attune.db`. There is no Attune company cloud account yet — it is a **local single-user** app.

```
You (browser at localhost:5173)
        │  asks/answers in JSON
        ▼
Backend (localhost:8000)
        ├── attune.db (SQLite)
        ├── USDA FoodData Central (food search)
        └── Google Gemini (Insights chat)
```

---

## 2. Frontend stack (what you see)

### Vite

**What:** A tool that starts a local website for development and bundles your code.  
**Why:** Fast refresh when files change; standard for modern React apps.  
**How used:** `npm run dev` in `frontend/` → usually http://localhost:5173  

### React

**What:** A library for building UI from components (pages, buttons, panels).  
**Why:** Good for multi-screen apps; the ecosystem matches Vite + TypeScript.  
**How used:** Each screen is a component in `frontend/src/pages/`. Shared chrome in `components/`.

### TypeScript

**What:** JavaScript with types (shapes of data).  
**Why:** Catches “wrong field” bugs earlier (e.g. mood overall must be a number).  
**How used:** All `.ts` / `.tsx` files under `frontend/src/`.

### React Router

**What:** Maps URLs to pages (`/home`, `/sleep`, …).  
**Why:** So tabs and refresh behave like a real app.  
**How used:** Wired in `App.tsx` under `AppLayout`.

### CSS (custom tokens, not a big UI kit)

**What:** Plain CSS with variables in `index.css` (`--accent`, fonts, etc.).  
**Why:** Full control of Attune’s green/blue look without fighting Material/Chakra defaults; avoids purple AI-template look.  
**How used:** Global styles + small files like `AiPanel.css`, `layout.css`.

### Fonts: Outfit + Figtree

**What:** Google Fonts loaded in `index.html`.  
**Why:** Expressive, non-default (not Inter/Roboto). Locked design preference.  
**How used:** CSS variables `--font-display` / `--font-body`.

### `api.ts` (the frontend’s phone line)

**What:** Every call to the backend (`getUser`, `addFood`, `aiChat`, …).  
**Why:** One place for URLs and error handling.  
**How used:** Pages import `api` and call functions; `todayISO()` returns **local** calendar date (important!).

### PWA-ish setup

**What:** Vite React app structured like a Progressive Web App.  
**Why:** Feels app-like in the browser; installability can be polished later.  
**How used:** You mainly use it as a local website for now.

---

## 3. Backend stack (the brain + notebook)

### Python

**What:** Language for the API and calculations.  
**Why:** Strong libraries for APIs, databases, HTTP clients, and AI SDKs.  
**How used:** Everything under `backend/app/`.

### Virtual environment (`.venv`)

**What:** A private folder of Python packages for this project only.  
**Why:** Doesn’t mess up your global Python; reproducible installs.  
**How used on your PC:** Prefer calling tools directly:

```text
backend\.venv\Scripts\uvicorn.exe
backend\.venv\Scripts\python.exe
```

(`Activate.ps1` often fails on Windows execution policy — skip it.)

### FastAPI

**What:** Framework that defines HTTP endpoints (`/api/foods`, `/api/ai/chat`, …).  
**Why:** Simple, automatic docs at `/docs`, great with type hints / Pydantic.  
**How used:** Routes live in `app/api.py`; app created in `app/main.py`.

### Uvicorn

**What:** The server process that *runs* FastAPI.  
**Why:** Industry standard ASGI server for FastAPI.  
**How used:**  

```powershell
.\.venv\Scripts\uvicorn.exe app.main:app --reload --port 8000
```

`--reload` restarts when Python files change (sometimes gets stuck — restart manually if weird).

### SQLAlchemy

**What:** Maps Python classes ↔ database tables.  
**Why:** Cleaner than raw SQL for an app this size; models stay readable.  
**How used:** `app/models.py` defines `User`, `FoodEntry`, `SleepLog`, `PeriodLog`, `MoodLog`, `WeightLog`.

### SQLite (`attune.db`)

**What:** A database that is just a file on disk.  
**Why:** No need to install Postgres/MySQL; perfect for a local single-user app.  
**How used:** Path set in `app/database.py`. Delete the file = wipe all local data (nuclear reset).

### Pydantic

**What:** Validates JSON in/out (e.g. mood 1–5).  
**Why:** Bad requests fail clearly instead of corrupting data.  
**How used:** `app/schemas.py`.

### python-dotenv + `config.py`

**What:** Loads `backend/.env` into environment variables.  
**Why:** Keeps API keys out of code and out of git.  
**How used:** Import `config` at startup; `get_env("GEMINI_API_KEY")` etc.

### httpx

**What:** HTTP client for calling other APIs.  
**Why:** Used to call USDA FoodData Central.  
**How used:** `app/services/usda.py`.

### google-genai (Gemini SDK)

**What:** Current official Python package to call Gemini (`google.genai`).  
**Why:** Replaces deprecated `google-generativeai`.  
**How used:** `app/services/gemini.py` builds a **Python context block** of your stats, then asks the model to narrate. Default model: **`gemini-2.5-flash`**. Chat turns are saved to `ai_messages` and shown on Insights overview.

### pytest

**What:** Test runner.  
**Why:** Locks phase / calorie / tier math so future edits don’t silently break them.  
**How used:** `backend/tests/test_phase_tdee.py`.

### Auth libraries (installed, unused yet)

`passlib`, `python-jose`, `bcrypt` are in `requirements.txt` for **future multi-user auth**. Not wired up. App still uses `SINGLE_USER_ID = 1`.

---

## 4. Domain services (the “why Attune is smart” code)

These are pure(ish) Python modules — the important product logic.

### `phase.py` — cycle day & phase labels

- Inputs: last period start date, cycle length, today  
- Outputs: cycle day, phase name (`menstrual` / `follicular` / `ovulation` / `luteal`)  
- Default length 28 if missing  
- Used by Home summary, Period UI, AI context  

### `tdee.py` — maintenance calories

- Mifflin–St Jeor **female** formula → BMR  
- × activity multiplier (Sedentary → Very active)  
- Used by Home + Eat progress bars  

### `cycles.py` — AI confidence tier

- Counts period logs  
- Maps to `blocked` / `hedged` / `confident`  
- Used by `/api/ai/tier`, home summary, chat gating  

### `usda.py` — food search

- Calls USDA search API with your key  
- Prefers Foundation / SR Legacy foods  
- Extracts calories / protein / carbs / fat (often **per 100g**)  
- Eat page fills the form; you can edit before Add  

### `gemini.py` — Insights

- If tier blocked → fixed message, **no** API call  
- Else assemble context (phase, calories, mood, sleep, foods…) in Python  
- Call Gemini with system rules: descriptive, not diagnostic  
- Fallbacks if a model is quota-dead  
- Friendly short errors for 429 quota walls  

---

## 5. How a click becomes saved data (example)

**Add food**

1. You submit the Eat form.  
2. React calls `api.addFood(...)`.  
3. Browser `POST`s JSON to `/api/foods`.  
4. FastAPI validates with `FoodCreate`.  
5. SQLAlchemy inserts into `food_entries` for user 1.  
6. Response returns; Eat refreshes today’s list and calorie bar.

**Ask Insights**

1. AiPanel `POST`s `/api/ai/chat`.  
2. Backend counts periods → tier.  
3. Builds context from DB.  
4. Calls Gemini (if not blocked).  
5. Returns `{ reply, tier, cycles_logged }`.

---

## 6. Data model (what’s in the database)

| Table | Stores |
|-------|--------|
| `users` | Profile, cycle fields, onboarding flags (single row id=1 for now) |
| `weight_logs` | Weight over time |
| `food_entries` | Name + macros + day |
| `sleep_logs` | Bed/wake, open flag, description |
| `period_logs` | Start/end, flow, symptoms |
| `mood_logs` | Overall 1–5, words, note, day |

There is **no** chat-history table yet (conversation is in the browser until refresh).

---

## 7. External services

| Service | Role | Key | Without key |
|---------|------|-----|-------------|
| USDA FoodData Central | Search foods | `USDA_API_KEY` | Manual entry still works |
| Google Gemini | Insights chat | `GEMINI_API_KEY` | Blocked message / error if you try chat when hedged+ |

Keys live only in `backend/.env`.

---

## 8. Why this stack (honest summary)

| Need | Choice | Why it fit Attune |
|------|--------|-------------------|
| Pretty interactive UI | React + Vite + TS | Fast to iterate screens with you |
| Simple local API | FastAPI | Clear routes + `/docs` for learning |
| Easy local storage | SQLite | One file, no DBA |
| Real food data | USDA FDC | Free official nutrient DB |
| Soft insights | Gemini Flash | Cheap/fast; tiers keep early claims humble |
| Your machine / Windows | venv `.exe` paths | Avoids PowerShell activate pain |
| Design control | Hand-rolled CSS tokens | Avoid generic AI-template look |

Alternatives exist (Next.js fullstack, Postgres, different AI vendors). This set optimized for **local learning + shipping a complete personal app** without cloud ops.

---

## 9. Folder cheat sheet

| Path | Meaning |
|------|---------|
| `frontend/src/pages/` | Screens you click |
| `frontend/src/components/` | Shared UI (nav, AI, faces) |
| `frontend/src/api.ts` | Browser → backend |
| `backend/app/api.py` | All API endpoints |
| `backend/app/services/` | Math + USDA + Gemini |
| `backend/attune.db` | Your data |
| `backend/.env` | Secrets |
| `.cursor/skills/attune-ui/` | UI rules for agents |

---

## 10. Words you’ll see agents use

| Term | Plain meaning |
|------|----------------|
| API / endpoint | A URL the frontend can call |
| JSON | Data format for those calls |
| CRUD | Create / Read / Update / Delete |
| CORS | Browser rule: backend must allow frontend origin |
| Migration | Changing DB shape over time |
| Env / `.env` | Secret config file |
| Tier | How confident Insights is allowed to sound |
| Hot reload | Auto-restart when code changes |

---

## 11. What is intentionally *not* in the stack yet

- Multi-user login / passwords in the app UI  
- Hosted production server (Vercel/Railway/etc.)  
- Native iPhone app  
- Offline sync across phones  
- Streaming AI responses  
- Automatic portion-size scaling for USDA  

Those are future options — see `FOR_FUTURE_AGENTS.md`.
