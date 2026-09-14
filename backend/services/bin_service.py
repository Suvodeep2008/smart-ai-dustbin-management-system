import json
from pathlib import Path
from datetime import datetime, timezone

DATA_FILE = Path(__file__).resolve().parents[1] / "data" / "bins.json"


def _load():
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))


def _save(data):
    DATA_FILE.write_text(
        json.dumps(data, indent=2),
        encoding="utf-8"
    )


def status_of(level):
    if level >= 85:
        return "critical"
    if level >= 60:
        return "warning"
    return "normal"


def status_label(status):
    return {
        "critical": "Critical",
        "warning": "Nearing full",
        "normal": "Normal"
    }[status]


def predict_eta(bin_data):
    rate = float(bin_data.get("rateHr", 0))
    remaining = max(
        0,
        100 - float(bin_data["level"])
    )

    if rate <= 0.05:
        return {
            "hours": None,
            "text": "Not filling"
        }

    hours = remaining / rate

    if hours < 1:
        text = "< 1 hour"
    elif hours < 24:
        text = f"{round(hours)} hours"
    else:
        text = f"{round(hours / 24)} days"

    return {
        "hours": round(hours, 2),
        "text": text
    }


def enrich(b):
    b = dict(b)

    b["status"] = status_of(
        float(b.get("level", 0))
    )

    b["statusLabel"] = status_label(
        b["status"]
    )

    b["eta"] = predict_eta(b)

    return b


def get_bins():
    return [
        enrich(b)
        for b in _load()
    ]


def get_bin(bin_id):
    for b in _load():

        if b["id"] == bin_id:
            return enrich(b)

    return None


def collect_bin(bin_id):

    data = _load()

    for b in data:

        if b["id"] == bin_id:

            b["level"] = 0

            # Keep the historical trend useful for the next
            # simulated filling cycle.
            b["trend"] = [
                0, 0, 0, 0, 0, 0
            ]

            b["lastCollected"] = (
                datetime.now(
                    timezone.utc
                ).isoformat()
            )

            _save(data)

            return enrich(b)

    return None


def simulate_fill(
    seconds=5,
    multiplier=300
):
    """
    Advance the waste level for the demo.

    multiplier=1 means real-time filling according
    to rateHr.

    The default 300x makes the filling visible during
    an SIH demonstration while retaining rateHr as
    the underlying sensor rate.
    """

    try:
        seconds = float(seconds)
    except (TypeError, ValueError):
        seconds = 5.0

    try:
        multiplier = float(multiplier)
    except (TypeError, ValueError):
        multiplier = 300.0

    seconds = max(0.1, min(seconds, 60))
    multiplier = max(0, min(multiplier, 1000))

    data = _load()

    for b in data:

        level = float(
            b.get("level", 0)
        )

        rate_hr = float(
            b.get("rateHr", 0)
        )

        increase = (
            rate_hr
            * (seconds / 3600)
            * multiplier
        )

        b["level"] = round(
            min(100, max(0, level + increase)),
            2
        )

    _save(data)

    return [
        enrich(b)
        for b in data
    ]
