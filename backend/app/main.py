from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from . import config  # noqa: F401 — load backend/.env on startup
from .api import router
from .database import Base, SessionLocal, engine
from .models import User

app = FastAPI(title="Attune API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

# Create tables on import (also runs for TestClient / scripts)
Base.metadata.create_all(bind=engine)


def migrate_sqlite() -> None:
    """Lightweight SQLite column adds for existing DBs."""
    with engine.begin() as conn:
        period_cols = {
            row[1] for row in conn.execute(text("PRAGMA table_info(period_logs)"))
        }
        if period_cols and "symptoms" not in period_cols:
            conn.execute(
                text("ALTER TABLE period_logs ADD COLUMN symptoms TEXT DEFAULT ''")
            )

        food_cols = {
            row[1] for row in conn.execute(text("PRAGMA table_info(food_entries)"))
        }
        if food_cols and "meal_type" not in food_cols:
            conn.execute(
                text(
                    "ALTER TABLE food_entries ADD COLUMN meal_type TEXT DEFAULT 'snack'"
                )
            )


migrate_sqlite()


def ensure_single_user() -> None:
    db = SessionLocal()
    try:
        if db.get(User, 1) is None:
            db.add(User(id=1))
            db.commit()
    finally:
        db.close()


ensure_single_user()


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    ensure_single_user()
