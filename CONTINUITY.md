# Attune — Continuity / handoff (READ THIS IN A NEW CHAT)

**Primary docs (hobby plan):**

| File | Who | Purpose |
|------|-----|---------|
| **[HANDOFF_TO_HOBBY_AGENT.md](HANDOFF_TO_HOBBY_AGENT.md)** | You | Paste-ready script to start a hobby chat |
| **[FOR_FUTURE_AGENTS.md](FOR_FUTURE_AGENTS.md)** | Agents | Everything: history, preferences, workflow, locked decisions, roadmap |
| **[TECH_STACK.md](TECH_STACK.md)** | You | What each technology is, why, how it’s used |
| **[HOW_TO_USE.md](HOW_TO_USE.md)** | You | Run, test, reset, troubleshoot — absolute beginner |
| `.cursor/skills/attune-ui/SKILL.md` | Agents | UI rules |
| This file | Both | Short status card — keep updated |

---

## Project

| | |
|--|--|
| **Path** | `C:\Users\falis\OneDrive\Desktop\Attune` |
| **Stack** | Vite + React + TS frontend · FastAPI + SQLAlchemy + SQLite backend |
| **DB** | `backend/attune.db` |
| **Auth** | Single user `id=1` — multi-user **later** (deferred by owner) |
| **Keys** | `backend/.env` → `USDA_API_KEY`, `GEMINI_API_KEY` (optional `GEMINI_MODEL`) |
| **Gemini default** | `gemini-2.5-flash` (not 2.0 — free tier often limit 0) |

---

## Run (Windows)

```powershell
cd C:\Users\falis\OneDrive\Desktop\Attune\backend
.\.venv\Scripts\uvicorn.exe app.main:app --reload --port 8000
```

```powershell
cd C:\Users\falis\OneDrive\Desktop\Attune\frontend
npm run dev
```

- App: http://localhost:5173  
- API docs: http://localhost:8000/docs  
- Tests: `backend` → `.\.venv\Scripts\python.exe -m pytest -q`  

**Do not use `Activate.ps1`** if execution policy blocks it.

---

## Build progress

| Step | Status |
|------|--------|
| 1–5 Scaffold → design polish | Done |
| UI rework (attune-ui) | Done (iterated; AI confirmed good) |
| 6 USDA food search | Done (+ portion sizes / scale from 100g) |
| 7 Gemini Insights + tiers | Done (`google-genai`, history + Overview) |
| 8 Docs + pytest | Done (expanded for hobby handoff) |
| 9 Multi-user auth | **Deferred** — owner said later |

---

## Agent rules (owner-enforced)

- Check in between steps; ask when unsure  
- Do not invent product/UI  
- Soft green/blue; Outfit + Figtree; no purple AI clichés  
- Update this file + `FOR_FUTURE_AGENTS.md` after big decisions  

---

## Locked decisions (summary)

- Nav: Sleep · Period · **Home** · Eat · Mood; Settings ☰  
- Cycle default 28; phase math in `phase.py`; local dates only (`todayISO`)  
- AI tiers: &lt;3 blocked, 3–5 hedged, 6+ confident; Python-first stats  
- Descriptive not prescriptive; no native iOS  
- **Home:** check-in first (mood / sleep / food); compact calories + sparkline secondary — not a second Eat page  
- **Eat:** MFP-style diary (Add per meal); USDA portions; today by meal  
- **Mood:** face picker → words (slide animation on Next) → 7-day history; hand-placed word-cloud draft (longer words center; selected stays enlarged); prompts without white cards  
- **Insights overview:** `/overview` via Settings only (not bottom nav); chat history persisted  

Full detail → `FOR_FUTURE_AGENTS.md`.

---

## Next likely work

1. Other UI polish from feedback  
2. Multi-user auth when owner asks  
3. Further mood cloud spacing tweaks only if owner asks  

---

## First message for new chat

```
Continue Attune at C:\Users\falis\OneDrive\Desktop\Attune.

Read: FOR_FUTURE_AGENTS.md, CONTINUITY.md,
.cursor/skills/attune-ui/SKILL.md, HOW_TO_USE.md.

Rules: check in between steps; ask when unsure; do not invent product/UI.
Backend via .\.venv\Scripts\uvicorn.exe (not Activate.ps1).
```
