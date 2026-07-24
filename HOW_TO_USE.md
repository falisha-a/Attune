# Attune — How to run, test, and do anything (beginner runbook)

Agents built most of this app. This file is **your** manual: start it, use it, test it, fix common problems, and reset data — without needing to understand the whole codebase.

**Project folder:** `C:\Users\falis\OneDrive\Desktop\Attune`

**Related docs:**  
- `TECH_STACK.md` — what the tech is  
- `FOR_FUTURE_AGENTS.md` — for future Cursor chats  
- `CONTINUITY.md` — short status  

---

## A. Mental model (30 seconds)

You must run **two things**:

| # | Name | Command lives in | Browser address |
|---|------|------------------|-----------------|
| 1 | Backend (API + database) | `backend` folder | http://localhost:8000 |
| 2 | Frontend (the app UI) | `frontend` folder | http://localhost:5173 |

**You use the app at 5173.**  
8000 is the engine. If 8000 is off, the UI cannot save or load.

Leave both terminal windows open while using Attune.

---

## B. One-time setup checklist

### Already done for you (usually)

- Python venv at `backend\.venv`  
- Frontend packages in `frontend\node_modules`  
- App code  

### You must have

1. **Node.js** (for `npm`) — https://nodejs.org/  
2. **Python 3** — https://www.python.org/  
3. API keys in **`backend\.env`** (not `.env.example`):

```
USDA_API_KEY=your_usda_key_here
GEMINI_API_KEY=your_gemini_key_here
```

Rules for keys:

- Paste **directly** after `=`  
- **No quotes** needed  
- File name must be exactly `.env`  
- Restart backend after editing  

Get keys:

- USDA: https://fdc.nal.usda.gov/api-key-signup.html  
- Gemini: https://aistudio.google.com/apikey  

Optional line:

```
GEMINI_MODEL=gemini-2.5-flash
```

(Default in code is already `gemini-2.5-flash`. Do **not** use `gemini-2.0-flash` — free tier often broken.)

---

## C. Start the app (every time)

### Terminal A — backend

1. Open PowerShell in the project (File Explorer → address bar → type `powershell`).  
2. Run:

```powershell
cd C:\Users\falis\OneDrive\Desktop\Attune\backend
.\.venv\Scripts\uvicorn.exe app.main:app --reload --port 8000
```

Success looks like: `Uvicorn running on http://127.0.0.1:8000`

**Do not rely on** `Activate.ps1` if Windows blocks scripts.

### Terminal B — frontend

New PowerShell window:

```powershell
cd C:\Users\falis\OneDrive\Desktop\Attune\frontend
npm run dev
```

Success looks like: `Local: http://localhost:5173/`  
Open that link.

### Stop

Click a terminal → **Ctrl+C**.

---

## D. First launch / onboarding

If you haven’t onboarded (or you reset):

1. Enter height, weight, age, activity  
2. Cycle length + last period optional (default cycle length = 28)  
3. Ethnicity optional  
4. Check the **disclaimer** (required)  
5. Continue → bottom tabs appear  

---

## E. How to use each part of the app

Bottom nav: **Sleep · Period · Home · Eat · Mood**  
Settings: **☰** top-right  
Insights: round **AI** button bottom-right  

### Home
- See today’s calories vs maintenance (bar)  
- 7-day calorie sparkline  
- Quiet links for incomplete check-ins  

### Sleep
- Big button: **Going to sleep**  
- Later same button: **I’m awake** (saves; session survives closing the browser)  
- Manual entry is secondary  

### Period
- Ring shows **Day X · phase** when a last period start exists  
- Log started / ended, flow, symptoms (+)  
- Past periods list (3 preview + Show all)  

### Eat
1. Pick a **meal** (Breakfast / Lunch / Dinner / Snacks)  
2. **Search USDA** → tap a food → **choose a portion** (macros scale from 100 g) → adds to that meal  
3. Or **quick-add** a recent item / **Add manually**  
4. Today’s list is grouped by meal; delete from there  

### Insights overview
- Open **Settings (☰) → Insights overview** (not in bottom nav)  
- See tier/status + full saved chat history; Clear available  
- Live chat still uses the AI button (history syncs)  

### Mood
1. Rate overall (faces 1–5)  
2. Pick word chips or Skip  
3. See today + last 7 days  

### Settings (☰)
- Edit profile, weight, cycle, ethnicity  

### Insights (AI)
- Tier depends on how many period **starts** you’ve logged:  
  - 0–2: blocked (unlock message; no Gemini call)  
  - 3–5: hedged (careful language)  
  - 6+: confident (still descriptive, not medical advice)  
- Needs `GEMINI_API_KEY` when not blocked  

---

## F. How to test that everything works (smoke test)

Do this after starting both servers (or after big changes).

| # | Test | Pass looks like |
|---|------|-----------------|
| 1 | Open http://localhost:5173 | App loads (onboarding or tabs) |
| 2 | http://localhost:8000/api/health | `{"status":"ok","app":"Attune"}` |
| 3 | http://localhost:8000/docs | Swagger API page |
| 4 | Hard refresh UI | Ctrl+Shift+R |
| 5 | Sleep start → wake | Session appears in history |
| 6 | Period: start or view ring | Day/phase shows if last start exists |
| 7 | Eat: search `banana` | Results appear (needs USDA key) |
| 8 | Eat: Add food | Today list + calorie bar update |
| 9 | Mood: log today | History shows face |
| 10 | AI: send a question | Reply or short unlock/quota message — not a huge Google error dump |
| 11 | Automated math tests | See section G |

### Hard refresh

Chrome/Edge: **Ctrl+Shift+R**  
Use this when the UI looks stuck on old behavior.

---

## G. Automated tests (math only)

No browser needed:

```powershell
cd C:\Users\falis\OneDrive\Desktop\Attune\backend
.\.venv\Scripts\python.exe -m pytest -q
```

You want: `passed` (currently 11 tests for phase / calories / AI tiers / nutrient parsing).

---

## H. Useful “do anything” recipes

### Restart backend after changing `.env`

1. Terminal A → Ctrl+C  
2. Run the uvicorn command again  

### Redo onboarding (keep other logs)

```powershell
cd C:\Users\falis\OneDrive\Desktop\Attune\backend
.\.venv\Scripts\python.exe -c "from app.database import SessionLocal; from app.models import User; db=SessionLocal(); u=db.get(User,1); u.onboarded=False; u.disclaimer_accepted=False; db.commit(); print('ok')"
```

Refresh browser.

### Wipe all data (nuclear)

1. Stop backend  
2. Delete `backend\attune.db`  
3. Start backend again  
4. Refresh frontend → onboarding  

### See API menu / try endpoints manually

Open http://localhost:8000/docs → expand an endpoint → Try it out.

### Check AI tier without the UI

With backend running, open:

http://localhost:8000/api/ai/tier  

### If frontend can’t connect

- Confirm Terminal A still shows Uvicorn running  
- Confirm URL is `127.0.0.1:8000` / localhost  
- Restart both  

### If port already in use

Something old is still running. Close old terminals, or ask an agent to stop processes on 8000 / 5173. Then start fresh.

### If USDA search fails

- Confirm `.env` exists (not only `.env.example`)  
- Confirm key has no quotes/spaces issues  
- Restart backend  
- Read error text on Eat page  

### If AI says quota / 429

- Wait a minute and retry  
- Confirm model isn’t forced to `gemini-2.0-flash` in `.env`  
- Check https://ai.google.dev/gemini-api/docs/rate-limits  
- Free tier limits are real — not an Attune bug  

### If Period circle is empty

- Log a period start or set last period in Settings  
- Hard refresh  

### Reinstall frontend packages (if `npm` breaks)

```powershell
cd C:\Users\falis\OneDrive\Desktop\Attune\frontend
npm install
```

### Reinstall backend packages (if Python imports fail)

```powershell
cd C:\Users\falis\OneDrive\Desktop\Attune\backend
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

---

## I. What files you should (and shouldn’t) touch

| Safe to edit as a beginner | Avoid unless guided |
|----------------------------|---------------------|
| `backend/.env` (keys only) | Random files under `app/` / `src/` without a goal |
| Your own notes | Committing `.env` to git |
| Reading the three docs | Deleting `.venv` unless reinstalling |

Your data file: `backend/attune.db` — treat like a personal notebook.

---

## J. Starting a new Cursor chat (hobby plan)

Paste:

```
Continue Attune at C:\Users\falis\OneDrive\Desktop\Attune.

Read: FOR_FUTURE_AGENTS.md, CONTINUITY.md,
.cursor/skills/attune-ui/SKILL.md, HOW_TO_USE.md.

Rules: check in between steps; ask when unsure; do not invent product/UI.
Backend via .\.venv\Scripts\uvicorn.exe (not Activate.ps1).
```

Tell the agent what you want next (example: “multi-user auth” or “UI tweak on Home”).

---

## K. What’s done vs later

**Done:** onboarding, Home, Sleep, Period, Eat (+ USDA), Mood, Settings, Insights (Gemini + tiers), phase/TDEE math, pytest, these docs.

**Later (when you ask):** multi-user auth, extra polish (portion sizes, chat history, Figma icons, etc.).

---

## L. Quick command cheat sheet

```powershell
# Backend
cd C:\Users\falis\OneDrive\Desktop\Attune\backend
.\.venv\Scripts\uvicorn.exe app.main:app --reload --port 8000

# Frontend
cd C:\Users\falis\OneDrive\Desktop\Attune\frontend
npm run dev

# Tests
cd C:\Users\falis\OneDrive\Desktop\Attune\backend
.\.venv\Scripts\python.exe -m pytest -q
```

App: http://localhost:5173  
API health: http://localhost:8000/api/health  
API docs: http://localhost:8000/docs  
