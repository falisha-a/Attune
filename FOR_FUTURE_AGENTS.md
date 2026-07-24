# Attune — Complete guide for future agents (hobby plan)

**Audience:** Any Cursor agent (especially hobby-tier) continuing this project with limited context.  
**Owner / user:** Builds on Windows; not a professional developer; agents have done most of the work so far.  
**Also required:** `.cursor/skills/attune-ui/SKILL.md` for any UI work.  
**Human docs:** `TECH_STACK.md` (what the stack is), `HOW_TO_USE.md` (how they run/test the app).  
**Short status card:** `CONTINUITY.md` (keep updated after big decisions).

---

## 0) First actions in every new chat

1. Read this file fully (or at least sections 1–8).  
2. Read `CONTINUITY.md` for current status.  
3. If touching UI: read `.cursor/skills/attune-ui/SKILL.md`.  
4. **Check in** before large steps. **Ask** when unsure. **Do not invent** product/UI.  
5. Run backend with venv **exe**, not `Activate.ps1`:

```powershell
cd C:\Users\falis\OneDrive\Desktop\Attune\backend
.\.venv\Scripts\uvicorn.exe app.main:app --reload --port 8000
```

```powershell
cd C:\Users\falis\OneDrive\Desktop\Attune\frontend
npm run dev
```

### Suggested first message (user can paste)

```
Continue Attune at C:\Users\falis\OneDrive\Desktop\Attune.

Read first: FOR_FUTURE_AGENTS.md (or AGENT_PLAN.md), CONTINUITY.md,
.cursor/skills/attune-ui/SKILL.md, HOW_TO_USE.md.

Rules: check in between steps; ask when unsure; do not invent product/UI.
Backend: .\.venv\Scripts\uvicorn.exe (not Activate.ps1).
Keys: backend/.env (USDA_API_KEY, GEMINI_API_KEY). Optional: GEMINI_MODEL.
```

> This file is also saved as `AGENT_PLAN.md` historically; prefer keeping **one** agent bible. If both exist, treat them as the same document family — update both or consolidate.

---

## 1) What Attune is (product thesis)

Attune is a **local women’s health web app (PWA-style)** focused on:

- Sleep logging  
- Period / cycle **context** (not the whole-app hero)  
- Food / calories vs maintenance  
- Mood logging  
- Gated **Insights** chat (Gemini)

### Core philosophy (locked)

- **Descriptive, not prescriptive** — no diagnosing, no medical orders, no “you should take X.”  
- **Weight is not a vanity tab** — it exists to compute maintenance calories and history.  
- **Cycle is context** — Period has a Flo-like ring; Home stays calorie / check-in first. **Never** put “Day X · phase” as a badge above the Home title.  
- **Single local user today** (`id=1`). Multi-user auth is **planned later**, not now unless the user asks.  
- **No native iOS** (user has no Mac). Web only.

Original blueprint lived in Downloads as `Womens_Health_App_Blueprint.md` — Attune implements that thesis.

---

## 2) Who the user is & how they want to work

### User context

- Windows machine; path: `C:\Users\falis\OneDrive\Desktop\Attune`  
- Moving toward **Cursor hobby plan** — fewer agent tokens, shorter chats. Docs must carry memory.  
- Agents built most of the app; user needs **clear beginner runbooks** and agents that **don’t assume** they know terminal/git/API jargon without explanation when writing *for the user*.  
- When writing *for agents*, be precise and complete.

### Non-negotiable working rules (user-enforced)

1. **Check in between steps** — don’t silently finish a multi-step roadmap.  
2. **Ask when unsure** — especially labels, flows, visual patterns, auth UX, new fields.  
3. **Do not invent product/UI decisions** — prefer asking over “improving” unprompted.  
4. **Keep handoff docs updated** after big decisions (`CONTINUITY.md` + this file + `attune-ui` skill if UI).  
5. **Small diffs** — implement only requested screens; don’t “refresh” unrelated pages.  
6. **After UI changes:** check mobile width + bottom-nav overlap.  
7. **Never commit secrets** — `.env` is gitignored.  
8. **Git:** only commit when user asks; no force-push / destructive git unless explicit.

### Tone with the user

- Direct and concise.  
- Check-ins over monologues.  
- Don’t dump huge raw API errors into the UI — shorten them (already done for Gemini 429s).

---

## 3) Design & UX preferences (locked + soft)

### Locked visual / UX

| Topic | Preference |
|-------|------------|
| Palette | Soft **green/blue**, near-white; user asked for **less pale / more green-blue** |
| Avoid | Purple AI gradients; cream+terracotta serif cliché; Flo clutter/popups; generic dashboard card grids |
| Fonts | **Outfit** (display) + **Figtree** (body). No Inter/Roboto/Arial/system as primary |
| Nav | Sleep · Period · **Home** (center raised/circled) · Eat · Mood |
| Settings | Quiet **☰** top-right — not a heavy top bar |
| Hover | Light lift / responsive feel; optional `title` tooltips on nav |
| Icons | Placeholders OK until user Figma assets arrive — then swap |
| Inspiration | Mio = *feel* only; do **not** copy another app wholesale |

Full UI rules: `.cursor/skills/attune-ui/SKILL.md`.

### Screen-by-screen (implemented intent)

**Home**  
- Calorie progress bar + 7-day sparkline as heroes  
- Quiet “still open today” text links (not a chip-row check-in)  
- No phase header badge  

**Sleep**  
- One large circular button: Going to sleep ↔ I’m awake  
- Open session in SQLite survives app/browser close  
- Manual / details secondary  

**Period**  
- Flo-like ring; center = Day X · phase  
- Log start/end, flow, symptoms via **slide-up log sheet** (not inline form swap)  
- Past periods: preview **3**, Show all  
- New period start **closes** previous open periods  
- Client + server phase so ring updates after log  
- Dates shown short (`7/20`); success messages auto-clear  

**Eat**  
- Progress bar like Home  
- Meal chips: Breakfast / Lunch / Dinner / Snacks — user picks before adding (**locked**)  
- Find food: USDA search + quick-add in one section  
- USDA: tap result → **portion picker** (scales from per 100 g via FDC details) → add to meal  
- USDA results capped (~5) in a **scrollable** panel  
- Manual entry behind “Add manually”  
- Today’s log **grouped by meal**

**Mood**  
- Walkthrough: overall (1–5) → word chips (Skip top-right) → history  
- **Slide animation** on Next / Save / Skip / Update (not finger-drag swipe)  
- History: today + 7-day row  
- Faces = soft **Attune-colored** circles in `MoodFace.tsx` (cooler blue → greener by rating); pill eyes + mouth — not flat black / no yellow emoji  
- Word list locked in `frontend/src/constants.ts`  
- **Word cloud draft (owner approved Jul 2026):** hand-placed `CLOUD_LAYOUTS` in `MoodPage.tsx` (8/9/10); Qualtrics-like oval; same chip size; longer words prefer **center** when they fit without overlap; selected stays enlarged; walkthrough prompts without white cards; **do not** bring back auto-packers or crush spacing after approval  
- **Custom mood word:** long-press empty space on word step → bubble input → chip (selected); included in saved `words`  
- No 3D tilt unless owner asks  

**Settings**  
- Profile, weight log, ethnicity (names only), cycle fields, disclaimer  
- Link to **Insights overview** (`/overview`) — history page not in bottom nav  
- “Load demo data” mentioned as later polish — not required  

**AI / Insights**  
- FAB bottom-right; chat **persisted** in `ai_messages`  
- Overview at `/overview` (Settings entry + link from AI panel)  
- Tiers: `<3` blocked, `3–5` hedged, `6+` confident  
- Blocked **never** calls Gemini (still saves unlock reply)  
- Stats in **Python**; narrates only  
- SDK: **`google-genai`**; default **`gemini-2.5-flash`** + fallbacks; `GEMINI_MODEL` override  
- Short quota errors in UI  

---

## 4) Locked product / data decisions

| Area | Decision |
|------|----------|
| Units | Imperial default (lb, inches) |
| Onboarding required | height, weight, age, activity, disclaimer checkbox |
| Onboarding optional | cycle length, last period start, ethnicity |
| Cycle length default | **28** if skipped (`DEFAULT_CYCLE_LENGTH_DAYS`) |
| Ethnicity UI | Category **names only**; risk notes for AI later — not shown in picker |
| Weight | Log anytime in Settings; updates profile + maintenance |
| Mood words | Fixed list in `constants.ts` — don’t invent new ones without asking |
| Period symptoms | Fixed list in `constants.ts` |
| AI model family | Gemini Flash; Python-first stats |
| Auth | Single user `id=1` until user asks for multi-user |
| Food DB | USDA FoodData Central |

### Phase math (`backend/app/services/phase.py`)

- Day 1 = first day of bleeding  
- Menstrual ≈ days 1–5 (capped vs ovulation)  
- Ovulation ≈ cycle_length − 14 (± window)  
- Luteal ≈ last ~14 days  
- Teaching model for UI — not clinical diagnosis  

### Dates (critical bug class)

- Frontend **must** use local `todayISO()` in `api.ts`  
- **Never** `toISOString().slice(0,10)` for “today” (UTC day-shift bugs)  

### TDEE (`tdee.py`)

- Mifflin–St Jeor **female** × activity multipliers  
- Activity labels must match onboarding/Settings strings exactly  

### AI tiers (`cycles.py`)

- Count = number of `PeriodLog` rows (period starts)  
- 0–2 → `blocked`; 3–5 → `hedged`; 6+ → `confident`  

---

## 5) Project layout

```
C:\Users\falis\OneDrive\Desktop\Attune\
  frontend/                 Vite + React + TypeScript
    src/
      App.tsx               Onboarding gate vs routes
      api.ts                All fetch helpers + todayISO()
      constants.ts          Locked lists
      pages/                Home Sleep Period Eat Mood Settings Onboarding
      components/           AppLayout AiPanel MoodFace
      index.css             Design tokens
  backend/
    .venv/                  Python virtualenv (use Scripts\*.exe)
    .env                    Secrets (gitignored) — user creates from .env.example
    .env.example            USDA_API_KEY, GEMINI_API_KEY, optional GEMINI_MODEL
    attune.db               SQLite data file
    requirements.txt
    pytest.ini
    tests/test_phase_tdee.py
    app/
      main.py               FastAPI app, CORS, migrate, seed user 1
      api.py                All routes; SINGLE_USER_ID = 1
      models.py             SQLAlchemy
      schemas.py            Pydantic
      config.py             load_dotenv
      database.py           SQLite engine
      services/
        phase.py tdee.py cycles.py usda.py gemini.py
  .cursor/skills/attune-ui/SKILL.md
  CONTINUITY.md
  AGENT_PLAN.md / this agent bible
  TECH_STACK.md
  HOW_TO_USE.md
  HOW_TO_TEST.md            Older notes — prefer HOW_TO_USE.md
```

---

## 6) Backend API map

Base: `http://127.0.0.1:8000` · Docs: `/docs`

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Sanity |
| GET/PUT | `/api/user` | Profile |
| POST | `/api/onboarding` | First-run (disclaimer required) |
| GET/POST | `/api/weights` | Weight history / log |
| GET | `/api/foods/search?q=` | USDA search → macros |
| GET/POST | `/api/foods` | List/add (`?day=YYYY-MM-DD`) |
| DELETE | `/api/foods/{id}` | Delete |
| GET | `/api/sleep` | History |
| GET | `/api/sleep/open` | Open session or null |
| POST | `/api/sleep/start` | Going to sleep |
| POST | `/api/sleep/wake` | I’m awake |
| POST | `/api/sleep/manual` | Manual range |
| GET/POST | `/api/periods` | List / start log |
| PATCH | `/api/periods/{id}` | Update (end, flow, symptoms) |
| GET/POST | `/api/moods` | Mood logs |
| GET | `/api/home/summary` | Phase, calories, maintenance, sleep, mood, AI tier |
| GET | `/api/ai/tier` | `{ cycles_logged, tier }` |
| POST | `/api/ai/chat` | `{ message }` → `{ tier, cycles_logged, reply }` |

CORS allows localhost `5173` / `5174`.

---

## 7) Build history (what happened)

| Step | Status |
|------|--------|
| 1 Scaffold | Done |
| 2 Rough pages | Done |
| 3 Backend API + phase/TDEE | Done |
| 4 Wire UI ↔ API | Done |
| 5 Design polish | Done (iterated with user) |
| UI rework per attune-ui | Done / user-confirmed AI good |
| 6 USDA Food DB | Done |
| 7 Gemini Insights | Done (`gemini-2.5-flash`) |
| 8 Docs + pytest | Done / expanded for hobby handoff |
| 9 Multi-user auth | **Deferred** — user said later |

### Bugs fixed — do not reintroduce

1. UTC date slicing → local `todayISO()`  
2. Orphan open periods → auto-close on new start  
3. Empty period circle → optimistic/local phase + refresh  
4. PowerShell `Activate.ps1` blocked → use `uvicorn.exe` / `python.exe`  
5. Gemini `429` / `limit: 0` on `gemini-2.0-flash` → default `gemini-2.5-flash` + friendly errors + fallbacks  
6. Keys pasted into `.env.example` by mistake — app only reads **`.env`** (no quotes needed on keys)

### Sample data note

User asked for 3 normal past periods; DB was seeded at one point with ~May/Jun/Jul 2026 ranges. Data may change as they use the app — don’t assume seed forever.

---

## 8) Environment & secrets

`backend/.env` (never commit):

```
USDA_API_KEY=...
GEMINI_API_KEY=...
# optional:
# GEMINI_MODEL=gemini-2.5-flash-lite
```

- Plain values, **no quotes** required.  
- Restart uvicorn after changing `.env`.  
- USDA: https://fdc.nal.usda.gov/api-key-signup.html  
- Gemini: https://aistudio.google.com/apikey  

Without keys: manual food + blocked AI message still work; search/chat need keys.

---

## 9) Tests

```powershell
cd C:\Users\falis\OneDrive\Desktop\Attune\backend
.\.venv\Scripts\python.exe -m pytest -q
```

Covers phase, TDEE, AI tiers, USDA macro extract helper. No network required.

---

## 10) Roadmap for hobby agents (priority order)

### Do when user asks / when broken

1. Bugfixes, UI polish **with check-ins**  
2. Smoke-test Period / Eat / AI after changes  
3. Keep docs accurate  

### Deferred — multi-user auth (when asked)

Deps already in `requirements.txt`: `passlib`, `python-jose`, `bcrypt`.

Suggested plan:

1. Email + password_hash on User (or accounts table)  
2. `POST /api/auth/register`, `POST /api/auth/login` → JWT  
3. Replace `SINGLE_USER_ID` / `get_or_create_user` with `get_current_user`  
4. Frontend login/register + Bearer token in `api.ts`  
5. Migration story for existing `attune.db`  

**Ask user** before inventing auth UX (email vs username, where logout lives, etc.).

### Optional polish (only if requested)

- Figma icon swap  
- Mood word cloud  
- Demo data button  
- Ethnicity risk notes into AI context (names only in UI still)

### Do not do unless asked

- Native mobile apps  
- Purple redesigns / Flo clone spam  
- Prescriptive medical AI  
- Unsolicited refactors of working screens  
- Committing `.env` or force-pushing  

**Done recently:** USDA portions, AI chat history + Settings→Overview, migrate to `google-genai`. 

---

## 11) Definition of “working”

- Backend + frontend start; onboarding → tabs  
- Each tab reads/writes SQLite  
- Period shows day/phase when last period start exists  
- Eat USDA search works with key; manual always works  
- AI replies with key when tier ≥ hedged; blocked returns unlock copy without Gemini  
- `pytest` passes  
- Docs in this trio exist for hobby continuity  

---

## 12) Agent anti-patterns on this repo

- Inventing mood words / symptoms / nav order  
- Putting phase on Home header  
- Using UTC for calendar “today”  
- Calling `Activate.ps1` as the only run path  
- Using `gemini-2.0-flash` as default  
- Shipping confident AI tone before 6 cycles  
- Large unsolicited redesigns  
- Leaving secrets in `.env.example`  

---

## 13) When context is thin (hobby plan survival)

If the chat is short on memory:

1. Re-read this file + `CONTINUITY.md`  
2. Grep `SINGLE_USER_ID`, `todayISO`, `ai_confidence_tier`, `DEFAULT_MODEL`  
3. Ask the user one clarifying question rather than guessing  
4. Prefer minimal patches  

You are continuing a **finished core app**, not a greenfield. Default to preservation + asked changes.
