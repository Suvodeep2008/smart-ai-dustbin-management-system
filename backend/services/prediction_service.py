from math import ceil


def predict_fill_time(level: float, rate_hr: float) -> dict:
    """
    Predict how long a bin will take to reach 100%.

    level   = current fill percentage
    rate_hr = average fill increase per hour
    """

    # Keep values safe
    level = max(0, min(100, float(level)))
    rate_hr = max(0, float(rate_hr))

    # Already full
    if level >= 100:
        return {
            "hours": 0,
            "text": "Full now",
            "overflow_risk": "critical"
        }

    # No measurable fill rate
    if rate_hr <= 0:
        return {
            "hours": None,
            "text": "Unknown",
            "overflow_risk": "low"
        }

    remaining = 100 - level
    hours = remaining / rate_hr

    # Risk classification
    if hours <= 2:
        risk = "critical"
    elif hours <= 8:
        risk = "high"
    elif hours <= 24:
        risk = "medium"
    else:
        risk = "low"

    # Human-readable time
    if hours < 1:
        minutes = max(1, round(hours * 60))
        text = f"{minutes} min"
    elif hours < 24:
        text = f"{ceil(hours)} hours"
    else:
        days = ceil(hours / 24)
        text = f"{days} days"

    return {
        "hours": round(hours, 2),
        "text": text,
        "overflow_risk": risk
    }


def calculate_priority(level: float, rate_hr: float) -> int:
    """
    Calculate a 0-100 collection priority score.
    Higher score = more urgent.
    """

    prediction = predict_fill_time(level, rate_hr)

    score = 0

    # Current fill contribution
    score += level * 0.6

    # Fill-rate contribution
    score += min(rate_hr * 5, 20)

    # Prediction contribution
    risk = prediction["overflow_risk"]

    if risk == "critical":
        score += 20
    elif risk == "high":
        score += 12
    elif risk == "medium":
        score += 6

    return min(100, round(score))