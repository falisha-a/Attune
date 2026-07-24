"""Cycle phase calculation from last period start + average cycle length.

Common teaching model (28-day reference), aligned with clinical overviews
(e.g. NCBI StatPearls, Cleveland Clinic):
- Cycle day 1 = first day of menstrual bleeding
- Menstrual bleeding typically ~3–7 days (we use days 1–5 as the labeled menstrual window)
- Follicular phase runs from day 1 through ovulation; after menses we label days 6..(ovulation-1) as follicular for the UI
- Ovulation is typically ~14 days before the next period (luteal length is the more stable part)
- Luteal phase is commonly ~14 days (often cited 12–14; normal range ~10–17)

For non-28-day cycles we keep luteal ≈ 14 days (capped), place ovulation at
(cycle_length - luteal_len), and keep menstrual as days 1–5 (capped so it
cannot overrun ovulation).
"""

from __future__ import annotations

from datetime import date


PHASES = ("menstrual", "follicular", "ovulation", "luteal")

# Used when the user skips cycle length in onboarding / Settings
DEFAULT_CYCLE_LENGTH_DAYS = 28


def effective_cycle_length(cycle_length_days: int | None) -> int:
    if cycle_length_days is None or cycle_length_days < 1:
        return DEFAULT_CYCLE_LENGTH_DAYS
    return cycle_length_days


def cycle_day(last_period_start: date, today: date, cycle_length_days: int) -> int:
    """1-based day within the cycle, wrapping by cycle length."""
    if cycle_length_days < 1:
        raise ValueError("cycle_length_days must be >= 1")
    delta = (today - last_period_start).days
    # If start is in the future (timezone quirks), treat as day 1
    if delta < 0:
        return 1
    return (delta % cycle_length_days) + 1


def phase_boundaries(cycle_length_days: int) -> dict[str, int]:
    """Return inclusive day bounds for each labeled phase."""
    if cycle_length_days < 1:
        raise ValueError("cycle_length_days must be >= 1")

    # Luteal is the relatively stable ~14-day stretch at the end of the cycle
    luteal_len = min(14, max(1, cycle_length_days - 1))
    ovulation_day = cycle_length_days - luteal_len  # day 14 on a 28-day cycle

    # Typical period length midpoint (~5 days), never past the day before ovulation
    menstrual_end = min(5, max(1, ovulation_day - 1))

    # Small ovulation window around the estimated day (±1 when there is room)
    ov_start = max(menstrual_end + 1, ovulation_day - 1)
    ov_end = min(cycle_length_days, ovulation_day + 1)
    # Ensure at least one luteal day when cycle is long enough
    if ov_end >= cycle_length_days and cycle_length_days > ov_start:
        ov_end = cycle_length_days - 1

    return {
        "menstrual_end": menstrual_end,
        "ovulation_start": ov_start,
        "ovulation_end": ov_end,
        "ovulation_day": ovulation_day,
        "luteal_len": luteal_len,
    }


def phase_for_day(day: int, cycle_length_days: int) -> str:
    if day < 1 or day > cycle_length_days:
        raise ValueError("day out of range for cycle length")

    b = phase_boundaries(cycle_length_days)

    if day <= b["menstrual_end"]:
        return "menstrual"
    if day < b["ovulation_start"]:
        return "follicular"
    if day <= b["ovulation_end"]:
        return "ovulation"
    return "luteal"


def current_phase(
    last_period_start: date | None,
    cycle_length_days: int | None,
    today: date | None = None,
) -> dict:
    """Return phase info. Cycle length defaults to 28 if missing."""
    today = today or date.today()
    length = effective_cycle_length(cycle_length_days)
    if last_period_start is None:
        return {
            "available": False,
            "cycle_day": None,
            "phase": None,
            "cycle_length_days": length,
            "last_period_start": None,
            "using_default_length": cycle_length_days is None,
        }

    day = cycle_day(last_period_start, today, length)
    return {
        "available": True,
        "cycle_day": day,
        "phase": phase_for_day(day, length),
        "cycle_length_days": length,
        "last_period_start": last_period_start.isoformat(),
        "using_default_length": cycle_length_days is None
        or cycle_length_days < 1,
    }
