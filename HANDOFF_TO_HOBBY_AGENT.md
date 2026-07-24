# Attune — How to hand off to a hobby-level Cursor agent

Use this when you start a **new chat** on Cursor hobby plan. Copy Section A into the chat. Keep Sections B–C for yourself if the agent gets lost.

---

## A) Paste this as your first message (copy everything in the box)

```
Continue Attune at C:\Users\falis\OneDrive\Desktop\Attune.

Before doing anything, read these in order:
1) FOR_FUTURE_AGENTS.md
2) CONTINUITY.md
3) .cursor/skills/attune-ui/SKILL.md
4) HOW_TO_USE.md (if you need run/test commands)

Rules (strict):
- Check in with me between steps
- Ask when unsure
- Do not invent product, copy, fields, or UI decisions
- Prefer small changes; only touch what I asked for
- Keep CONTINUITY.md + FOR_FUTURE_AGENTS.md updated after big decisions

How to run (Windows):
- Backend: cd backend → .\.venv\Scripts\uvicorn.exe app.main:app --reload --port 8000
- Frontend: cd frontend → npm run dev
- Do NOT use Activate.ps1 if PowerShell blocks it
- Keys live in backend/.env (USDA_API_KEY, GEMINI_API_KEY; optional GEMINI_MODEL)
- App: http://localhost:5173 · API docs: http://localhost:8000/docs

Status:
- Core app works (Home, Sleep, Period, Eat with meals+portions, Mood, Settings, Insights/Gemini, chat history, Overview via Settings)
- Multi-user auth is NOT built yet (deferred)
- Current focus: UI polish unless I say otherwise

What I want in this chat:
[WRITE YOUR ASK HERE — e.g. “Polish the Eat page layout” or “Start multi-user auth”]
```

Replace the last line with whatever you actually want that day.

---

## B) Good short asks (examples)

- `Polish Eat UI only — keep meal chips and portion flow; don’t redesign other tabs.`
- `Tweak Period ring spacing on mobile; don’t change logging logic.`
- `Implement multi-user auth (email + password + JWT). Ask me before inventing login/register UI.`
- `Fix bug: [describe what you see]. Check in before changing more than one area.`

Avoid vague prompts like “make it better” — hobby chats burn tokens fast; be specific.

---

## C) If the agent seems lost, paste this nudge

```
Stop and re-read FOR_FUTURE_AGENTS.md + CONTINUITY.md + attune-ui skill.
Do not invent UI. Summarize what you’ll change in 3 bullets, then wait for my OK.
```

---

## D) Docs map (what each file is for)

| File | Who opens it |
|------|----------------|
| **FOR_FUTURE_AGENTS.md** | Agents — full memory (prefs, history, roadmap) |
| **CONTINUITY.md** | Both — short status + first-message stub |
| **TECH_STACK.md** | You — what the tech is / why |
| **HOW_TO_USE.md** | You — run, test, troubleshoot |
| **attune-ui skill** | Agents — UI rules only |

You usually only paste Section A. The agent should pull the rest from the files.

---

## E) Before you leave / cancel Pro

1. Servers stopped (or Ctrl+C in both terminals)  
2. `backend/.env` has your keys (never share/commit it)  
3. Data is in `backend/attune.db`  
4. This file + the four docs above are in the project folder  

You’re set for hobby-plan chats.
