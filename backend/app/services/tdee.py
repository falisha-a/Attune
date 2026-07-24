"""Mifflin–St Jeor maintenance calorie estimate (female equation)."""

from __future__ import annotations

ACTIVITY_MULTIPLIERS = {
    "Sedentary": 1.2,
    "Light": 1.375,
    "Moderate": 1.55,
    "Active": 1.725,
    "Very active": 1.9,
}


def bmr_mifflin_st_jeor_female(weight_lb: float, height_in: float, age: int) -> float:
    """BMR in kcal/day using the female Mifflin–St Jeor formula (metric internally)."""
    weight_kg = weight_lb * 0.45359237
    height_cm = height_in * 2.54
    return 10 * weight_kg + 6.25 * height_cm - 5 * age - 161


def maintenance_calories(
    weight_lb: float | None,
    height_in: float | None,
    age: int | None,
    activity_level: str | None,
) -> dict:
    if (
        weight_lb is None
        or height_in is None
        or age is None
        or activity_level not in ACTIVITY_MULTIPLIERS
    ):
        return {
            "available": False,
            "bmr": None,
            "maintenance": None,
            "activity_level": activity_level,
        }

    bmr = bmr_mifflin_st_jeor_female(weight_lb, height_in, age)
    maintenance = bmr * ACTIVITY_MULTIPLIERS[activity_level]
    return {
        "available": True,
        "bmr": round(bmr),
        "maintenance": round(maintenance),
        "activity_level": activity_level,
    }
