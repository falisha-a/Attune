# Attune — How to test (legacy pointer)

**Prefer the full beginner runbook:**

# → [`HOW_TO_USE.md`](HOW_TO_USE.md)

That file covers starting servers, smoke-testing every screen, pytest, resets, API keys, and troubleshooting.

This older file is kept so old links don’t break. Details below may be stale relative to `HOW_TO_USE.md` and `FOR_FUTURE_AGENTS.md`.

---

## Quick smoke list

1. Backend: `.\.venv\Scripts\uvicorn.exe app.main:app --reload --port 8000`  
2. Frontend: `npm run dev` in `frontend/`  
3. Health: http://localhost:8000/api/health  
4. App: http://localhost:5173  
5. pytest: `.\.venv\Scripts\python.exe -m pytest -q` in `backend/`  

See **HOW_TO_USE.md §F–H** for the complete checklist.
