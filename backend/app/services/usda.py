"""USDA FoodData Central search → macros + serving portions."""

from __future__ import annotations

import httpx

from ..config import get_env

FDC_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search"
FDC_FOOD_URL = "https://api.nal.usda.gov/fdc/v1/food/{fdc_id}"

# Nutrient numbers used across Foundation / SR Legacy / Branded
NUTRIENT_ENERGY_KCAL = {1008, 2047, 2048}  # Energy (kcal) variants
NUTRIENT_PROTEIN = {1003}
NUTRIENT_FAT = {1004}
NUTRIENT_CARBS = {1005}


def _nutrient_id(entry: dict) -> int | None:
    if "nutrientId" in entry:
        try:
            return int(entry["nutrientId"])
        except (TypeError, ValueError):
            return None
    nutrient = entry.get("nutrient") or {}
    if "id" in nutrient:
        try:
            return int(nutrient["id"])
        except (TypeError, ValueError):
            return None
    if "number" in entry:
        try:
            return int(float(str(entry["number"])))
        except (TypeError, ValueError):
            return None
    return None


def _nutrient_amount(entry: dict) -> float:
    for key in ("value", "amount"):
        if key in entry and entry[key] is not None:
            try:
                return float(entry[key])
            except (TypeError, ValueError):
                return 0.0
    return 0.0


def _nutrient_unit(entry: dict) -> str:
    unit = entry.get("unitName") or (entry.get("nutrient") or {}).get("unitName") or ""
    return str(unit).lower()


def extract_macros(food_nutrients: list | None) -> dict[str, float]:
    calories = protein = carbs = fat = 0.0
    if not food_nutrients:
        return {
            "calories": 0.0,
            "protein_g": 0.0,
            "carbs_g": 0.0,
            "fat_g": 0.0,
        }

    for entry in food_nutrients:
        nid = _nutrient_id(entry)
        if nid is None:
            continue
        amount = _nutrient_amount(entry)
        unit = _nutrient_unit(entry)

        if nid in NUTRIENT_ENERGY_KCAL:
            if unit == "kj":
                continue
            calories = amount
        elif nid in NUTRIENT_PROTEIN:
            protein = amount
        elif nid in NUTRIENT_FAT:
            fat = amount
        elif nid in NUTRIENT_CARBS:
            carbs = amount

    return {
        "calories": round(calories, 1),
        "protein_g": round(protein, 1),
        "carbs_g": round(carbs, 1),
        "fat_g": round(fat, 1),
    }


def scale_macros(per_100g: dict[str, float], grams: float) -> dict[str, float]:
    if grams <= 0:
        return {k: 0.0 for k in ("calories", "protein_g", "carbs_g", "fat_g")}
    factor = grams / 100.0
    return {
        "calories": round(float(per_100g.get("calories", 0)) * factor, 1),
        "protein_g": round(float(per_100g.get("protein_g", 0)) * factor, 1),
        "carbs_g": round(float(per_100g.get("carbs_g", 0)) * factor, 1),
        "fat_g": round(float(per_100g.get("fat_g", 0)) * factor, 1),
    }


def extract_portions(food: dict) -> list[dict]:
    """
    Build serving options. Always include 100g as the analytical baseline.
    Prefer foodPortions (details); fall back to search foodMeasures / servingSize.
    """
    portions: list[dict] = [
        {"label": "100 g", "grams": 100.0, "is_default": True},
    ]
    seen_grams = {100.0}

    def add(label: str, grams: float) -> None:
        grams = round(float(grams), 1)
        if grams <= 0 or grams in seen_grams:
            return
        seen_grams.add(grams)
        portions.append({"label": label, "grams": grams, "is_default": False})

    for p in food.get("foodPortions") or []:
        grams = p.get("gramWeight")
        if grams is None:
            continue
        measure = p.get("measureUnit")
        measure_name = (
            measure.get("name") if isinstance(measure, dict) else None
        )
        desc = p.get("portionDescription") or p.get("modifier") or measure_name
        amount = p.get("amount")
        if desc and amount is not None:
            label = (
                f"{amount:g} {desc}".strip()
                if isinstance(amount, (int, float))
                else str(desc)
            )
        elif desc:
            label = str(desc)
        else:
            label = f"{float(grams):g} g"
        add(label, float(grams))

    for m in food.get("foodMeasures") or []:
        grams = m.get("gramWeight") or m.get("disseminationText")
        # disseminationText isn't grams — skip if not numeric gramWeight
        if m.get("gramWeight") is None:
            continue
        label = m.get("disseminationText") or f"{float(grams):g} g"
        add(str(label), float(m["gramWeight"]))

    serving = food.get("servingSize")
    unit = (food.get("servingSizeUnit") or "").strip()
    if serving is not None:
        try:
            serving_f = float(serving)
        except (TypeError, ValueError):
            serving_f = None
        if serving_f and serving_f > 0:
            # Branded foods often use grams already; if unit is g/ml treat as grams
            if unit.lower() in ("g", "gram", "grams", "ml"):
                add(f"1 serving ({serving_f:g} {unit or 'g'})", serving_f)
            elif unit.lower() in ("oz", "ounce", "ounces"):
                add(f"1 serving ({serving_f:g} oz)", serving_f * 28.3495)

    return portions[:12]


def _require_key() -> str:
    api_key = get_env("USDA_API_KEY")
    if not api_key:
        raise RuntimeError(
            "USDA_API_KEY is not set. Add it to backend/.env (see .env.example)."
        )
    return api_key


def _short_description(description: str) -> str:
    """
    USDA descriptions are verbose. Keep the first two comma parts when useful
    (e.g. "Cheese, cheddar") but drop "or …" alternate-name tails.
    """
    parts = [p.strip() for p in (description or "").split(",") if p.strip()]
    if not parts:
        return "Unknown food"
    if len(parts) == 1:
        return parts[0]
    if parts[1].lower().startswith("or "):
        return parts[0]
    two = f"{parts[0]}, {parts[1]}"
    if len(two) <= 48:
        return two
    return parts[0]


def _format_name(food: dict) -> str:
    description = food.get("description") or "Unknown food"
    return _short_description(description)


def search_foods(query: str, page_size: int = 8) -> list[dict]:
    """
    Search USDA FDC. Macros are per 100g; portions listed when present on the hit.
    Prefers Foundation / SR Legacy, then falls back to Survey + Branded if empty.
    """
    api_key = _require_key()
    q = (query or "").strip()
    if not q:
        return []

    size = max(1, min(page_size, 25))
    attempts = (
        "Foundation,SR Legacy",
        "Survey (FNDDS),Branded",
    )

    foods: list = []
    with httpx.Client(timeout=15.0) as client:
        for data_type in attempts:
            res = client.get(
                FDC_SEARCH_URL,
                params={
                    "api_key": api_key,
                    "query": q,
                    "pageSize": size,
                    "dataType": data_type,
                },
            )
            res.raise_for_status()
            foods = res.json().get("foods") or []
            if foods:
                break

    results: list[dict] = []
    for food in foods:
        macros = extract_macros(food.get("foodNutrients"))
        results.append(
            {
                "fdc_id": food.get("fdcId"),
                "name": _format_name(food),
                "data_type": food.get("dataType"),
                "serving_hint": "Macros shown per 100 g — pick a portion before adding",
                "per_100g": macros,
                "portions": extract_portions(food),
                **macros,
            }
        )
    return results


def get_food(fdc_id: int) -> dict:
    """Full food details with portions (preferred path for serving sizes)."""
    api_key = _require_key()
    url = FDC_FOOD_URL.format(fdc_id=fdc_id)
    with httpx.Client(timeout=15.0) as client:
        res = client.get(url, params={"api_key": api_key})
        res.raise_for_status()
        food = res.json()

    macros = extract_macros(food.get("foodNutrients"))
    return {
        "fdc_id": food.get("fdcId") or fdc_id,
        "name": _format_name(food),
        "data_type": food.get("dataType"),
        "serving_hint": "Pick a portion — macros scale from per 100 g",
        "per_100g": macros,
        "portions": extract_portions(food),
        **macros,
    }
