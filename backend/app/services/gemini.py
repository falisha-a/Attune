"""Gemini Flash chat via google.genai — stats in Python first; messages persisted."""

from __future__ import annotations

from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_env
from ..models import AiMessage, FoodEntry, MoodLog, PeriodLog, SleepLog, User
from .cycles import ai_confidence_tier, cycles_logged
from .phase import current_phase
from .tdee import maintenance_calories

# gemini-2.0-flash free tier often reports limit:0 (retired/unavailable).
DEFAULT_MODEL = "gemini-2.5-flash"
FALLBACK_MODELS = (
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite",
)


def resolve_model_name() -> str:
    return get_env("GEMINI_MODEL") or DEFAULT_MODEL


def friendly_gemini_error(exc: BaseException) -> str:
    text = str(exc)
    lower = text.lower()
    if "429" in text or "quota" in lower or "rate" in lower:
        return (
            "Gemini quota is used up for now (free-tier limit). "
            "Wait a minute and try again, or set GEMINI_MODEL=gemini-2.5-flash-lite "
            "in backend/.env. Details: https://ai.google.dev/gemini-api/docs/rate-limits"
        )
    if "api key" in lower or "401" in text or "403" in text:
        return "Gemini rejected the API key. Check GEMINI_API_KEY in backend/.env."
    first = text.strip().split("\n", 1)[0]
    if len(first) > 180:
        first = first[:177] + "…"
    return f"Gemini error: {first}"


SYSTEM_BASE = """You are Attune Insights — a calm women's health companion.
Rules:
- Be descriptive, not prescriptive. Do not diagnose or give medical orders.
- Prefer patterns from the user's logged data over generic advice.
- Keep answers short (a few sentences) unless they ask for more.
- If data is missing, say so plainly.
- Never invent numbers that are not in the context block.
"""

TIER_PROMPTS = {
    "blocked": "",
    "hedged": (
        "Confidence tier: HEDGED (3–5 cycles logged). "
        "Use cautious, hedged language: 'it may…', 'some people notice…', "
        "'based on limited logs…'. Do not sound certain."
    ),
    "confident": (
        "Confidence tier: CONFIDENT (6+ cycles logged). "
        "You may speak more clearly about patterns in THEIR data, "
        "but stay descriptive and non-clinical."
    ),
}


def build_user_context(db: Session, user: User) -> dict:
    today = date.today()
    count = cycles_logged(db, user.id)
    tier = ai_confidence_tier(count)

    last_start = user.last_period_start
    if last_start is None:
        latest = db.scalars(
            select(PeriodLog)
            .where(PeriodLog.user_id == user.id)
            .order_by(PeriodLog.start_date.desc())
        ).first()
        if latest is not None:
            last_start = latest.start_date

    foods_today = db.scalars(
        select(FoodEntry).where(
            FoodEntry.user_id == user.id,
            FoodEntry.logged_on == today,
        )
    ).all()
    calories_today = sum(f.calories for f in foods_today)

    last_sleep = db.scalars(
        select(SleepLog)
        .where(SleepLog.user_id == user.id, SleepLog.is_open.is_(False))
        .order_by(SleepLog.wake_time.desc())
    ).first()

    mood = db.scalars(
        select(MoodLog).where(
            MoodLog.user_id == user.id,
            MoodLog.logged_on == today,
        )
    ).first()

    recent_moods = db.scalars(
        select(MoodLog)
        .where(MoodLog.user_id == user.id)
        .order_by(MoodLog.logged_on.desc())
        .limit(7)
    ).all()

    maint = maintenance_calories(
        user.weight_lb, user.height_in, user.age, user.activity_level
    )
    phase = current_phase(last_start, user.cycle_length_days, today)

    sleep_hours = None
    if last_sleep and last_sleep.wake_time is not None:
        sleep_hours = round(
            (last_sleep.wake_time - last_sleep.bedtime).total_seconds() / 3600, 2
        )

    return {
        "tier": tier,
        "cycles_logged": count,
        "phase": phase,
        "calories_today": calories_today,
        "maintenance": maint,
        "activity_level": user.activity_level,
        "ethnicity": user.ethnicity,
        "last_sleep_hours": sleep_hours,
        "todays_mood": (
            {
                "overall": mood.overall,
                "words": [w for w in (mood.words or "").split(",") if w],
            }
            if mood
            else None
        ),
        "recent_moods": [
            {
                "date": m.logged_on.isoformat(),
                "overall": m.overall,
                "words": [w for w in (m.words or "").split(",") if w],
            }
            for m in recent_moods
        ],
        "foods_today": [
            {
                "name": f.name,
                "calories": f.calories,
                "meal": getattr(f, "meal_type", None) or "snack",
            }
            for f in foods_today[:12]
        ],
    }


def format_context_block(ctx: dict) -> str:
    lines = [
        "USER DATA CONTEXT (computed in Python — treat as ground truth):",
        f"- AI tier: {ctx['tier']} | cycles logged: {ctx['cycles_logged']}",
        f"- Phase: {ctx['phase']}",
        f"- Calories today: {ctx['calories_today']}",
        f"- Maintenance: {ctx['maintenance']}",
        f"- Activity: {ctx['activity_level']}",
        f"- Ethnicity (category name only): {ctx['ethnicity']}",
        f"- Last sleep hours: {ctx['last_sleep_hours']}",
        f"- Today's mood: {ctx['todays_mood']}",
        f"- Recent moods (up to 7): {ctx['recent_moods']}",
        f"- Foods today: {ctx['foods_today']}",
    ]
    return "\n".join(lines)


def _save_message(db: Session, user_id: int, role: str, content: str) -> None:
    db.add(AiMessage(user_id=user_id, role=role, content=content))
    db.commit()


def list_history(db: Session, user_id: int, limit: int = 100) -> list[AiMessage]:
    rows = db.scalars(
        select(AiMessage)
        .where(AiMessage.user_id == user_id)
        .order_by(AiMessage.created_at.asc())
        .limit(limit)
    ).all()
    return list(rows)


def clear_history(db: Session, user_id: int) -> int:
    rows = db.scalars(
        select(AiMessage).where(AiMessage.user_id == user_id)
    ).all()
    n = len(rows)
    for row in rows:
        db.delete(row)
    db.commit()
    return n


def _extract_reply_text(response: object) -> str:
    text = getattr(response, "text", None)
    if text:
        return str(text).strip()
    # google.genai may expose candidates
    candidates = getattr(response, "candidates", None) or []
    for cand in candidates:
        content = getattr(cand, "content", None)
        parts = getattr(content, "parts", None) or []
        chunks = []
        for part in parts:
            t = getattr(part, "text", None)
            if t:
                chunks.append(str(t))
        if chunks:
            return "\n".join(chunks).strip()
    return ""


def chat(db: Session, user: User, message: str) -> dict:
    """
    Return { tier, cycles_logged, reply }.
    Persists user + assistant messages. Blocked tier never calls Gemini
    but still saves the exchange so Overview stays consistent.
    """
    message = (message or "").strip()
    if not message:
        raise ValueError("Message cannot be empty")

    ctx = build_user_context(db, user)
    tier = ctx["tier"]
    cycles = ctx["cycles_logged"]

    _save_message(db, user.id, "user", message)

    if tier == "blocked":
        reply = (
            "Insights unlock after you log a few periods. "
            "With fewer than 3 cycle starts logged, Attune stays quiet so it "
            "doesn't invent patterns. Keep logging — you're building the picture."
        )
        _save_message(db, user.id, "assistant", reply)
        return {"tier": tier, "cycles_logged": cycles, "reply": reply}

    api_key = get_env("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY is not set. Add it to backend/.env (see .env.example)."
        )

    try:
        from google import genai
        from google.genai import types
    except ImportError as exc:
        raise RuntimeError(
            "google-genai is not installed. Run: pip install google-genai"
        ) from exc

    client = genai.Client(api_key=api_key)
    prompt = (
        f"{format_context_block(ctx)}\n\n"
        f"User question: {message}\n\n"
        "Answer helpfully within the rules."
    )
    system = SYSTEM_BASE + "\n" + TIER_PROMPTS[tier]

    preferred = resolve_model_name()
    candidates: list[str] = []
    for name in (preferred, *FALLBACK_MODELS):
        if name not in candidates:
            candidates.append(name)

    last_error: BaseException | None = None
    for model_name in candidates:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system,
                ),
            )
            reply = _extract_reply_text(response)
            if not reply:
                reply = "I couldn't form a reply just now. Try again in a moment."
            _save_message(db, user.id, "assistant", reply)
            return {
                "tier": tier,
                "cycles_logged": cycles,
                "reply": reply,
            }
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            err = str(exc).lower()
            if not any(
                token in err
                for token in ("429", "quota", "not found", "not supported", "404")
            ):
                friendly = friendly_gemini_error(exc)
                _save_message(db, user.id, "assistant", friendly)
                raise RuntimeError(friendly) from exc
            continue

    friendly = friendly_gemini_error(
        last_error or RuntimeError("Gemini request failed")
    )
    _save_message(db, user.id, "assistant", friendly)
    raise RuntimeError(friendly)
