from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import get_db
from .models import FoodEntry, MoodLog, PeriodLog, SleepLog, User, WeightLog
from .schemas import (
    MEAL_TYPES,
    AiChatIn,
    AiChatOut,
    AiHistoryOut,
    AiMessageOut,
    FoodCreate,
    FoodOut,
    FoodSearchResult,
    HomeSummary,
    MoodCreate,
    MoodOut,
    OnboardingIn,
    PeriodCreate,
    PeriodOut,
    PeriodUpdate,
    SleepManual,
    SleepOut,
    SleepStart,
    SleepWake,
    UserOut,
    UserUpdate,
    WeightCreate,
    WeightOut,
)
from .services import gemini as gemini_service
from .services import usda as usda_service
from .services.cycles import ai_confidence_tier, cycles_logged
from .services.phase import current_phase, DEFAULT_CYCLE_LENGTH_DAYS
from .services.tdee import maintenance_calories

router = APIRouter(prefix="/api")

SINGLE_USER_ID = 1


def period_to_out(row: PeriodLog) -> PeriodOut:
    raw = (row.symptoms or "").strip()
    symptoms = [s for s in raw.split(",") if s]
    # Keep legacy flags mirrored into the list for older rows
    if row.cramps and "cramps" not in symptoms:
        symptoms.append("cramps")
    if row.bloating and "bloating" not in symptoms:
        symptoms.append("bloating")
    return PeriodOut(
        id=row.id,
        start_date=row.start_date,
        end_date=row.end_date,
        flow=row.flow,
        cramps=row.cramps or "cramps" in symptoms,
        bloating=row.bloating or "bloating" in symptoms,
        symptoms=symptoms,
    )


def as_utc(dt: datetime | None) -> datetime | None:
    """Treat naive DB datetimes as UTC so JSON includes a timezone offset."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def utc_now_naive() -> datetime:
    """UTC 'now' stored naive in SQLite (always interpret as UTC on read)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def to_utc_naive(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        # Incoming without tz: assume UTC (clients should send offset/Z)
        return dt
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


def sleep_to_out(row: SleepLog) -> SleepOut:
    duration = None
    if row.wake_time is not None:
        duration = round((row.wake_time - row.bedtime).total_seconds() / 3600, 2)
    return SleepOut(
        id=row.id,
        bedtime=as_utc(row.bedtime),
        wake_time=as_utc(row.wake_time),
        description=row.description,
        is_open=row.is_open,
        duration_hours=duration,
    )


def mood_to_out(row: MoodLog) -> MoodOut:
    words = [w for w in row.words.split(",") if w] if row.words else []
    return MoodOut(
        id=row.id,
        logged_on=row.logged_on,
        overall=row.overall,
        words=words,
        note=row.note,
    )


def get_or_create_user(db: Session) -> User:
    user = db.get(User, SINGLE_USER_ID)
    if user is None:
        user = User(id=SINGLE_USER_ID)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


# ----- Health / profile -----


@router.get("/health")
def health():
    return {"status": "ok", "app": "Attune"}


@router.get("/user", response_model=UserOut)
def get_user(db: Session = Depends(get_db)):
    return get_or_create_user(db)


@router.put("/user", response_model=UserOut)
def update_user(payload: UserUpdate, db: Session = Depends(get_db)):
    user = get_or_create_user(db)
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user


@router.post("/onboarding", response_model=UserOut)
def complete_onboarding(payload: OnboardingIn, db: Session = Depends(get_db)):
    if not payload.disclaimer_accepted:
        raise HTTPException(400, "Disclaimer must be accepted")
    user = get_or_create_user(db)
    user.height_in = payload.height_in
    user.weight_lb = payload.weight_lb
    user.age = payload.age
    user.activity_level = payload.activity_level
    user.ethnicity = payload.ethnicity
    user.ethnicity_other = payload.ethnicity_other
    user.cycle_length_days = (
        payload.cycle_length_days
        if payload.cycle_length_days
        else DEFAULT_CYCLE_LENGTH_DAYS
    )
    user.last_period_start = payload.last_period_start
    user.disclaimer_accepted = True
    user.onboarded = True
    db.add(
        WeightLog(
            user_id=user.id,
            logged_on=date.today(),
            weight_lb=payload.weight_lb,
        )
    )
    db.commit()
    db.refresh(user)
    return user


# ----- Weight -----


@router.get("/weights", response_model=list[WeightOut])
def list_weights(db: Session = Depends(get_db)):
    user = get_or_create_user(db)
    rows = db.scalars(
        select(WeightLog)
        .where(WeightLog.user_id == user.id)
        .order_by(WeightLog.logged_on.desc())
    ).all()
    return rows


@router.post("/weights", response_model=WeightOut)
def add_weight(payload: WeightCreate, db: Session = Depends(get_db)):
    user = get_or_create_user(db)
    logged_on = payload.logged_on or date.today()
    row = WeightLog(user_id=user.id, logged_on=logged_on, weight_lb=payload.weight_lb)
    user.weight_lb = payload.weight_lb
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


# ----- Food -----


@router.get("/foods/search", response_model=list[FoodSearchResult])
def search_foods(q: str = "", db: Session = Depends(get_db)):
    """USDA FoodData Central search. Requires USDA_API_KEY in backend/.env."""
    get_or_create_user(db)
    try:
        return usda_service.search_foods(q, page_size=5)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(502, f"USDA search failed: {exc}") from exc


@router.get("/foods/fdc/{fdc_id}", response_model=FoodSearchResult)
def get_fdc_food(fdc_id: int, db: Session = Depends(get_db)):
    """USDA food details with serving portions (macros scale from per 100g)."""
    get_or_create_user(db)
    try:
        return usda_service.get_food(fdc_id)
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(502, f"USDA food lookup failed: {exc}") from exc


@router.get("/foods", response_model=list[FoodOut])
def list_foods(day: date | None = None, db: Session = Depends(get_db)):
    user = get_or_create_user(db)
    stmt = select(FoodEntry).where(FoodEntry.user_id == user.id)
    if day is not None:
        stmt = stmt.where(FoodEntry.logged_on == day)
    rows = db.scalars(stmt.order_by(FoodEntry.created_at.desc())).all()
    return rows


@router.post("/foods", response_model=FoodOut)
def add_food(payload: FoodCreate, db: Session = Depends(get_db)):
    user = get_or_create_user(db)
    meal = (payload.meal_type or "snack").strip().lower()
    if meal not in MEAL_TYPES:
        raise HTTPException(400, f"meal_type must be one of: {', '.join(MEAL_TYPES)}")
    row = FoodEntry(
        user_id=user.id,
        logged_on=payload.logged_on or date.today(),
        name=payload.name,
        calories=payload.calories,
        protein_g=payload.protein_g,
        carbs_g=payload.carbs_g,
        fat_g=payload.fat_g,
        meal_type=meal,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/foods/{food_id}")
def delete_food(food_id: int, db: Session = Depends(get_db)):
    user = get_or_create_user(db)
    row = db.get(FoodEntry, food_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(404, "Food entry not found")
    db.delete(row)
    db.commit()
    return {"ok": True}


# ----- Sleep -----


@router.get("/sleep", response_model=list[SleepOut])
def list_sleep(db: Session = Depends(get_db)):
    user = get_or_create_user(db)
    rows = db.scalars(
        select(SleepLog)
        .where(SleepLog.user_id == user.id)
        .order_by(SleepLog.bedtime.desc())
    ).all()
    return [sleep_to_out(r) for r in rows]


@router.get("/sleep/open", response_model=SleepOut | None)
def get_open_sleep(db: Session = Depends(get_db)):
    user = get_or_create_user(db)
    row = db.scalars(
        select(SleepLog).where(
            SleepLog.user_id == user.id,
            SleepLog.is_open.is_(True),
        )
    ).first()
    return sleep_to_out(row) if row else None


@router.post("/sleep/start", response_model=SleepOut)
def start_sleep(payload: SleepStart, db: Session = Depends(get_db)):
    user = get_or_create_user(db)
    existing = db.scalars(
        select(SleepLog).where(
            SleepLog.user_id == user.id,
            SleepLog.is_open.is_(True),
        )
    ).first()
    if existing is not None:
        raise HTTPException(400, "An open sleep session already exists")
    bedtime = (
        to_utc_naive(payload.bedtime) if payload.bedtime is not None else utc_now_naive()
    )
    row = SleepLog(
        user_id=user.id,
        bedtime=bedtime,
        is_open=True,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return sleep_to_out(row)


@router.post("/sleep/wake", response_model=SleepOut)
def wake_sleep(payload: SleepWake, db: Session = Depends(get_db)):
    user = get_or_create_user(db)
    row = db.scalars(
        select(SleepLog).where(
            SleepLog.user_id == user.id,
            SleepLog.is_open.is_(True),
        )
    ).first()
    if row is None:
        raise HTTPException(404, "No open sleep session")
    if payload.bedtime is not None:
        row.bedtime = to_utc_naive(payload.bedtime)
    row.wake_time = (
        to_utc_naive(payload.wake_time)
        if payload.wake_time is not None
        else utc_now_naive()
    )
    row.description = payload.description
    row.is_open = False
    db.commit()
    db.refresh(row)
    return sleep_to_out(row)


@router.post("/sleep/manual", response_model=SleepOut)
def manual_sleep(payload: SleepManual, db: Session = Depends(get_db)):
    user = get_or_create_user(db)
    row = SleepLog(
        user_id=user.id,
        bedtime=to_utc_naive(payload.bedtime),
        wake_time=to_utc_naive(payload.wake_time),
        description=payload.description,
        is_open=False,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return sleep_to_out(row)


# ----- Period -----


@router.get("/periods", response_model=list[PeriodOut])
def list_periods(db: Session = Depends(get_db)):
    user = get_or_create_user(db)
    rows = db.scalars(
        select(PeriodLog)
        .where(PeriodLog.user_id == user.id)
        .order_by(PeriodLog.start_date.desc())
    ).all()
    return [period_to_out(r) for r in rows]


@router.post("/periods", response_model=PeriodOut)
def add_period(payload: PeriodCreate, db: Session = Depends(get_db)):
    user = get_or_create_user(db)
    symptoms = list(payload.symptoms)
    if payload.cramps and "cramps" not in symptoms:
        symptoms.append("cramps")
    if payload.bloating and "bloating" not in symptoms:
        symptoms.append("bloating")

    # Close any open periods so only one "in progress" exists
    open_rows = db.scalars(
        select(PeriodLog).where(
            PeriodLog.user_id == user.id,
            PeriodLog.end_date.is_(None),
        )
    ).all()
    for prev in open_rows:
        # End the day before the new start when possible
        if payload.start_date > prev.start_date:
            prev.end_date = payload.start_date
        else:
            prev.end_date = prev.start_date

    row = PeriodLog(
        user_id=user.id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        flow=payload.flow,
        cramps="cramps" in symptoms,
        bloating="bloating" in symptoms,
        symptoms=",".join(symptoms),
    )
    user.last_period_start = payload.start_date
    if user.cycle_length_days is None:
        user.cycle_length_days = DEFAULT_CYCLE_LENGTH_DAYS
    db.add(row)
    db.commit()
    db.refresh(row)
    return period_to_out(row)


@router.patch("/periods/{period_id}", response_model=PeriodOut)
def update_period(period_id: int, payload: PeriodUpdate, db: Session = Depends(get_db)):
    user = get_or_create_user(db)
    row = db.get(PeriodLog, period_id)
    if row is None or row.user_id != user.id:
        raise HTTPException(404, "Period log not found")
    data = payload.model_dump(exclude_unset=True)
    if "symptoms" in data and data["symptoms"] is not None:
        symptoms = list(data.pop("symptoms"))
        row.symptoms = ",".join(symptoms)
        row.cramps = "cramps" in symptoms
        row.bloating = "bloating" in symptoms
    for key, value in data.items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return period_to_out(row)


# ----- Mood -----


@router.get("/moods", response_model=list[MoodOut])
def list_moods(db: Session = Depends(get_db)):
    user = get_or_create_user(db)
    rows = db.scalars(
        select(MoodLog)
        .where(MoodLog.user_id == user.id)
        .order_by(MoodLog.logged_on.desc())
    ).all()
    return [mood_to_out(r) for r in rows]


@router.post("/moods", response_model=MoodOut)
def add_mood(payload: MoodCreate, db: Session = Depends(get_db)):
    user = get_or_create_user(db)
    row = MoodLog(
        user_id=user.id,
        logged_on=payload.logged_on or date.today(),
        overall=payload.overall,
        words=",".join(payload.words),
        note=payload.note,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return mood_to_out(row)


# ----- Home summary -----


@router.get("/home/summary", response_model=HomeSummary)
def home_summary(db: Session = Depends(get_db)):
    user = get_or_create_user(db)
    today = date.today()

    if user.cycle_length_days is None:
        user.cycle_length_days = DEFAULT_CYCLE_LENGTH_DAYS
        db.commit()

    # Prefer profile last_period_start; else latest logged period start
    last_start = user.last_period_start
    if last_start is None:
        latest = db.scalars(
            select(PeriodLog)
            .where(PeriodLog.user_id == user.id)
            .order_by(PeriodLog.start_date.desc())
        ).first()
        if latest is not None:
            last_start = latest.start_date
            user.last_period_start = last_start
            db.commit()

    foods = db.scalars(
        select(FoodEntry).where(
            FoodEntry.user_id == user.id,
            FoodEntry.logged_on == today,
        )
    ).all()
    calories_today = sum(f.calories for f in foods)

    last_sleep_row = db.scalars(
        select(SleepLog)
        .where(SleepLog.user_id == user.id, SleepLog.is_open.is_(False))
        .order_by(SleepLog.wake_time.desc())
    ).first()

    mood_row = db.scalars(
        select(MoodLog).where(
            MoodLog.user_id == user.id,
            MoodLog.logged_on == today,
        )
    ).first()

    count = cycles_logged(db, user.id)

    return HomeSummary(
        phase=current_phase(last_start, user.cycle_length_days, today),
        calories_today=calories_today,
        maintenance=maintenance_calories(
            user.weight_lb, user.height_in, user.age, user.activity_level
        ),
        last_sleep=sleep_to_out(last_sleep_row) if last_sleep_row else None,
        todays_mood=mood_to_out(mood_row) if mood_row else None,
        cycles_logged=count,
        ai_confidence_tier=ai_confidence_tier(count),
    )


@router.get("/ai/tier")
def get_ai_tier(db: Session = Depends(get_db)):
    user = get_or_create_user(db)
    count = cycles_logged(db, user.id)
    return {
        "cycles_logged": count,
        "tier": ai_confidence_tier(count),
    }


@router.get("/ai/history", response_model=AiHistoryOut)
def ai_history(db: Session = Depends(get_db)):
    user = get_or_create_user(db)
    count = cycles_logged(db, user.id)
    rows = gemini_service.list_history(db, user.id)
    return AiHistoryOut(
        tier=ai_confidence_tier(count),
        cycles_logged=count,
        messages=[
            AiMessageOut(
                id=r.id,
                role=r.role,
                content=r.content,
                created_at=r.created_at,
            )
            for r in rows
        ],
    )


@router.delete("/ai/history")
def ai_clear_history(db: Session = Depends(get_db)):
    user = get_or_create_user(db)
    deleted = gemini_service.clear_history(db, user.id)
    return {"ok": True, "deleted": deleted}


@router.post("/ai/chat", response_model=AiChatOut)
def ai_chat(payload: AiChatIn, db: Session = Depends(get_db)):
    """Gemini Flash chat. Stats are computed in Python; tiers gate confidence."""
    user = get_or_create_user(db)
    try:
        result = gemini_service.chat(db, user, payload.message)
    except ValueError as exc:
        raise HTTPException(400, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            502, gemini_service.friendly_gemini_error(exc)
        ) from exc
    return AiChatOut(**result)
