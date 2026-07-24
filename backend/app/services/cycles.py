"""Helpers for completed-cycle count and AI confidence tier."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import PeriodLog


def cycles_logged(db: Session, user_id: int) -> int:
    """Count period start logs as completed/logged cycles."""
    rows = db.scalars(
        select(PeriodLog).where(PeriodLog.user_id == user_id)
    ).all()
    return len(rows)


def ai_confidence_tier(cycle_count: int) -> str:
    """
    Locked tiers:
    - 1–2 (and 0): blocked
    - 3–5: hedged
    - 6+: confident
    """
    if cycle_count < 3:
        return "blocked"
    if cycle_count <= 5:
        return "hedged"
    return "confident"
