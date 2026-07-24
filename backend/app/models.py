from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    height_in: Mapped[float | None] = mapped_column(Float, nullable=True)
    weight_lb: Mapped[float | None] = mapped_column(Float, nullable=True)
    age: Mapped[int | None] = mapped_column(Integer, nullable=True)
    activity_level: Mapped[str | None] = mapped_column(String(32), nullable=True)
    ethnicity: Mapped[str | None] = mapped_column(String(128), nullable=True)
    ethnicity_other: Mapped[str | None] = mapped_column(String(256), nullable=True)
    cycle_length_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_period_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    disclaimer_accepted: Mapped[bool] = mapped_column(Boolean, default=False)
    onboarded: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    weight_logs: Mapped[list["WeightLog"]] = relationship(back_populates="user")
    food_entries: Mapped[list["FoodEntry"]] = relationship(back_populates="user")
    sleep_logs: Mapped[list["SleepLog"]] = relationship(back_populates="user")
    period_logs: Mapped[list["PeriodLog"]] = relationship(back_populates="user")
    mood_logs: Mapped[list["MoodLog"]] = relationship(back_populates="user")


class WeightLog(Base):
    __tablename__ = "weight_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    logged_on: Mapped[date] = mapped_column(Date)
    weight_lb: Mapped[float] = mapped_column(Float)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="weight_logs")


class FoodEntry(Base):
    __tablename__ = "food_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    logged_on: Mapped[date] = mapped_column(Date)
    name: Mapped[str] = mapped_column(String(256))
    calories: Mapped[float] = mapped_column(Float, default=0)
    protein_g: Mapped[float] = mapped_column(Float, default=0)
    carbs_g: Mapped[float] = mapped_column(Float, default=0)
    fat_g: Mapped[float] = mapped_column(Float, default=0)
    # breakfast | lunch | dinner | snack
    meal_type: Mapped[str] = mapped_column(String(16), default="snack")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="food_entries")


class SleepLog(Base):
    __tablename__ = "sleep_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    bedtime: Mapped[datetime] = mapped_column(DateTime)
    wake_time: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_open: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="sleep_logs")


class PeriodLog(Base):
    __tablename__ = "period_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    start_date: Mapped[date] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    flow: Mapped[str | None] = mapped_column(String(32), nullable=True)
    cramps: Mapped[bool] = mapped_column(Boolean, default=False)
    bloating: Mapped[bool] = mapped_column(Boolean, default=False)
    symptoms: Mapped[str] = mapped_column(Text, default="")  # comma-separated
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="period_logs")


class MoodLog(Base):
    __tablename__ = "mood_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    logged_on: Mapped[date] = mapped_column(Date)
    overall: Mapped[int] = mapped_column(Integer)  # 1-5
    words: Mapped[str] = mapped_column(Text, default="")  # comma-separated
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="mood_logs")


class AiMessage(Base):
    __tablename__ = "ai_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    role: Mapped[str] = mapped_column(String(16))  # user | assistant
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
