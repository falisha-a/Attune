"""Unit tests for phase + TDEE (pure Python, no DB)."""

from datetime import date

from app.services.phase import (
    DEFAULT_CYCLE_LENGTH_DAYS,
    cycle_day,
    current_phase,
    phase_boundaries,
    phase_for_day,
)
from app.services.tdee import bmr_mifflin_st_jeor_female, maintenance_calories
from app.services.cycles import ai_confidence_tier
from app.services.usda import extract_macros


def test_default_cycle_length():
    assert DEFAULT_CYCLE_LENGTH_DAYS == 28


def test_cycle_day_day_one():
    assert cycle_day(date(2026, 1, 1), date(2026, 1, 1), 28) == 1


def test_cycle_day_wraps():
    # 28 days later is day 1 of next cycle
    assert cycle_day(date(2026, 1, 1), date(2026, 1, 29), 28) == 1


def test_phase_28_day_reference():
    # Day 1–5 menstrual, mid follicular, ~ovulation day 14, luteal after
    assert phase_for_day(1, 28) == "menstrual"
    assert phase_for_day(5, 28) == "menstrual"
    assert phase_for_day(8, 28) == "follicular"
    assert phase_for_day(14, 28) == "ovulation"
    assert phase_for_day(20, 28) == "luteal"
    assert phase_for_day(28, 28) == "luteal"


def test_phase_boundaries_luteal_about_14():
    b = phase_boundaries(28)
    assert b["luteal_len"] == 14
    assert b["ovulation_day"] == 14


def test_current_phase_unavailable_without_start():
    result = current_phase(None, 28, date(2026, 7, 18))
    assert result["available"] is False
    assert result["phase"] is None


def test_current_phase_available():
    result = current_phase(date(2026, 7, 1), 28, date(2026, 7, 10))
    assert result["available"] is True
    assert result["cycle_day"] == 10
    assert result["phase"] in ("follicular", "menstrual", "ovulation", "luteal")


def test_bmr_female_reasonable():
    # 140 lb, 65 in, age 30 — rough ballpark ~1400 kcal BMR
    bmr = bmr_mifflin_st_jeor_female(140, 65, 30)
    assert 1200 < bmr < 1600


def test_maintenance_requires_fields():
    assert maintenance_calories(None, 65, 30, "Moderate")["available"] is False
    out = maintenance_calories(140, 65, 30, "Moderate")
    assert out["available"] is True
    assert out["maintenance"] > out["bmr"]


def test_ai_tiers():
    assert ai_confidence_tier(0) == "blocked"
    assert ai_confidence_tier(2) == "blocked"
    assert ai_confidence_tier(3) == "hedged"
    assert ai_confidence_tier(5) == "hedged"
    assert ai_confidence_tier(6) == "confident"


def test_extract_macros_from_search_shape():
    nutrients = [
        {"nutrientId": 1008, "value": 89, "unitName": "kcal"},
        {"nutrientId": 1003, "value": 1.1, "unitName": "g"},
        {"nutrientId": 1004, "value": 0.3, "unitName": "g"},
        {"nutrientId": 1005, "value": 23, "unitName": "g"},
    ]
    macros = extract_macros(nutrients)
    assert macros["calories"] == 89
    assert macros["protein_g"] == 1.1
    assert macros["fat_g"] == 0.3
    assert macros["carbs_g"] == 23


def test_scale_macros_half_portion():
    from app.services.usda import scale_macros

    scaled = scale_macros(
        {"calories": 100, "protein_g": 10, "carbs_g": 20, "fat_g": 5},
        50,
    )
    assert scaled["calories"] == 50
    assert scaled["protein_g"] == 5
    assert scaled["carbs_g"] == 10
    assert scaled["fat_g"] == 2.5
