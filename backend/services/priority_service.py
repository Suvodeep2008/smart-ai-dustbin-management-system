def calculate_priority(bin_data):
    """
    Calculate AI-style collection priority from 0 to 100.

    Higher score = more urgent collection.
    """

    level = float(bin_data.get("level", 0))

    rate = float(
        bin_data.get(
            "rateHr",
            bin_data.get("fill_rate", 0)
        )
    )

    # Keep values inside sensible limits
    level = max(0, min(level, 100))
    rate = max(0, rate)

    # ============================================================
    # 1. CURRENT FILL LEVEL
    # ============================================================
    # Maximum contribution = 50 points
    fill_score = level * 0.50

    # ============================================================
    # 2. FILL SPEED
    # ============================================================
    # Faster filling = higher urgency
    #
    # 5% per hour or more gives maximum 20 points.
    rate_score = min(rate * 4, 20)

    # ============================================================
    # 3. OVERFLOW URGENCY
    # ============================================================
    # Estimate how soon the bin can reach 100%.
    #
    # Example:
    # 80% full at 5%/hr
    # remaining = 20%
    # estimated time = 4 hours
    # ============================================================

    if rate > 0 and level < 100:
        remaining = 100 - level
        hours_to_full = remaining / rate
    elif level >= 100:
        hours_to_full = 0
    else:
        hours_to_full = 999

    if hours_to_full <= 3:
        overflow_score = 20

    elif hours_to_full <= 6:
        overflow_score = 15

    elif hours_to_full <= 12:
        overflow_score = 10

    elif hours_to_full <= 24:
        overflow_score = 5

    else:
        overflow_score = 0

    # ============================================================
    # 4. STATUS BONUS
    # ============================================================

    if level >= 85:
        status_score = 10

    elif level >= 60:
        status_score = 5

    else:
        status_score = 0

    # ============================================================
    # FINAL PRIORITY SCORE
    # ============================================================

    score = (
        fill_score
        + rate_score
        + overflow_score
        + status_score
    )

    return round(
        min(score, 100),
        2
    )


# ============================================================
# PRIORITY LABEL
# ============================================================

def get_priority_label(score):

    if score >= 75:
        return "URGENT"

    elif score >= 50:
        return "HIGH"

    elif score >= 30:
        return "MEDIUM"

    else:
        return "LOW"


# ============================================================
# COMPLETE BIN PRIORITY
# ============================================================

def calculate_bin_priority(bin_data):

    score = calculate_priority(bin_data)

    label = get_priority_label(score)

    return {
        "bin_id": bin_data.get("id"),
        "priority_score": score,
        "priority": label
    }