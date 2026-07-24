# Attune

Local full-stack women’s health tracker for sleep, nutrition, mood, and menstrual cycle — with USDA food search and Gemini-powered insights.

> Descriptive, not prescriptive. Cycle is context; weight is not a vanity tab.

## Stack

| Layer | Tech |
|--------|------|
| Frontend | React 19, TypeScript, Vite, React Router |
| Backend | FastAPI, SQLAlchemy, Pydantic, Uvicorn |
| Database | SQLite (local file) |
| Integrations | [USDA FoodData Central](https://fdc.nal.usda.gov/), Google Gemini Flash |
| Tests | pytest (cycle phase + TDEE helpers) |

## Features

- **Onboarding** — profile, optional cycle fields, required disclaimer  
- **Home** — daily check-in nudges, calories vs maintenance, 7-day sparkline  
- **Eat** — meal diary with USDA search and portion-based macros  
- **Sleep** — one-tap start/wake; open session survives app close  
- **Period** — cycle ring with day/phase, symptoms, history  
- **Mood** — rating → word picker → history  
- **Insights** — Gemini chat with confidence tiers by completed cycle count  
- **Settings** — weight, ethnicity, cycle, profile  

Single local user for now (no multi-user auth yet).

## Quick start

### Prerequisites

- Node.js 20+  
- Python 3.10+  

### 1. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\pip.exe install -r requirements.txt
copy .env.example .env
# Add USDA_API_KEY and/or GEMINI_API_KEY to .env (optional but needed for food search / AI)
.\.venv\Scripts\uvicorn.exe app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs  

### 2. Frontend

```powershell
cd frontend
npm install
npm run dev
```

App: http://localhost:5173  

### Tests

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -q
```

## Project layout

```
backend/app/          FastAPI API, models, phase/TDEE/USDA/Gemini services
backend/tests/        Unit tests
frontend/src/pages/   Screens (Home, Eat, Sleep, Period, Mood, …)
frontend/src/api.ts   Backend client
TECH_STACK.md         Plain-language stack map
HOW_TO_USE.md         Run / reset / troubleshoot
```

## Privacy

API keys live in `backend/.env` (not committed). Personal data stays in local `backend/attune.db` (also ignored by git).

## License

Personal / portfolio project. Ask before redistributing.
