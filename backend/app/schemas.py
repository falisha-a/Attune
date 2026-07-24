from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ----- User / profile -----


class UserOut(ORMModel):
    id: int
    height_in: float | None
    weight_lb: float | None
    age: int | None
    activity_level: str | None
    ethnicity: str | None
    ethnicity_other: str | None
    cycle_length_days: int | None
    last_period_start: date | None
    disclaimer_accepted: bool
    onboarded: bool


class UserUpdate(BaseModel):
    height_in: float | None = None
    weight_lb: float | None = None
    age: int | None = None
    activity_level: str | None = None
    ethnicity: str | None = None
    ethnicity_other: str | None = None
    cycle_length_days: int | None = None
    last_period_start: date | None = None
    disclaimer_accepted: bool | None = None
    onboarded: bool | None = None


class OnboardingIn(BaseModel):
    height_in: float
    weight_lb: float
    age: int
    activity_level: str
    ethnicity: str | None = None
    ethnicity_other: str | None = None
    cycle_length_days: int | None = None
    last_period_start: date | None = None
    disclaimer_accepted: bool = Field(..., description="Must be true")


# ----- Weight -----


class WeightCreate(BaseModel):
    weight_lb: float
    logged_on: date | None = None


class WeightOut(ORMModel):
    id: int
    logged_on: date
    weight_lb: float


# ----- Food -----


MEAL_TYPES = ("breakfast", "lunch", "dinner", "snack")


class FoodCreate(BaseModel):
    name: str
    calories: float = 0
    protein_g: float = 0
    carbs_g: float = 0
    fat_g: float = 0
    meal_type: str = "snack"  # breakfast | lunch | dinner | snack
    logged_on: date | None = None


class FoodOut(ORMModel):
    id: int
    logged_on: date
    name: str
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float
    meal_type: str = "snack"


class FoodSearchPortion(BaseModel):
    label: str
    grams: float
    is_default: bool = False


class FoodSearchResult(BaseModel):
    fdc_id: int | None = None
    name: str
    data_type: str | None = None
    serving_hint: str | None = None
    calories: float = 0  # per 100g (same as per_100g.calories)
    protein_g: float = 0
    carbs_g: float = 0
    fat_g: float = 0
    per_100g: dict[str, float] | None = None
    portions: list[FoodSearchPortion] = []


# ----- Sleep -----


class SleepStart(BaseModel):
    bedtime: datetime | None = None


class SleepWake(BaseModel):
    wake_time: datetime | None = None
    bedtime: datetime | None = None
    description: str | None = None


class SleepManual(BaseModel):
    bedtime: datetime
    wake_time: datetime
    description: str | None = None


class SleepOut(ORMModel):
    id: int
    bedtime: datetime
    wake_time: datetime | None
    description: str | None
    is_open: bool
    duration_hours: float | None = None


# ----- Period -----


class PeriodCreate(BaseModel):
    start_date: date
    end_date: date | None = None
    flow: str | None = None  # light | medium | heavy
    cramps: bool = False
    bloating: bool = False
    symptoms: list[str] = []


class PeriodUpdate(BaseModel):
    end_date: date | None = None
    flow: str | None = None
    cramps: bool | None = None
    bloating: bool | None = None
    symptoms: list[str] | None = None


class PeriodOut(ORMModel):
    id: int
    start_date: date
    end_date: date | None
    flow: str | None
    cramps: bool
    bloating: bool
    symptoms: list[str] = []


# ----- Mood -----


class MoodCreate(BaseModel):
    overall: int = Field(..., ge=1, le=5)
    words: list[str] = []
    note: str | None = None
    logged_on: date | None = None


class MoodOut(ORMModel):
    id: int
    logged_on: date
    overall: int
    words: list[str]
    note: str | None


# ----- Home / AI gate -----


class HomeSummary(BaseModel):
    phase: dict
    calories_today: float
    maintenance: dict
    last_sleep: SleepOut | None
    todays_mood: MoodOut | None
    cycles_logged: int
    ai_confidence_tier: str  # blocked | hedged | confident


class AiChatIn(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)


class AiChatOut(BaseModel):
    tier: str
    cycles_logged: int
    reply: str


class AiMessageOut(ORMModel):
    id: int
    role: str  # user | assistant | system
    content: str
    created_at: datetime


class AiHistoryOut(BaseModel):
    tier: str
    cycles_logged: int
    messages: list[AiMessageOut]
