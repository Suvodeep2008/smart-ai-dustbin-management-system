import json
from pathlib import Path
from datetime import datetime, timezone

from services.bin_service import collect_bin


BASE_DIR = Path(__file__).resolve().parent.parent
TRUCK_FILE = BASE_DIR / "data" / "trucks.json"


# =========================================================
# FILE FUNCTIONS
# =========================================================

def load_trucks():
    with open(TRUCK_FILE, "r", encoding="utf-8") as file:
        return json.load(file)


def save_trucks(trucks):
    with open(TRUCK_FILE, "w", encoding="utf-8") as file:
        json.dump(trucks, file, indent=2)


# =========================================================
# ROUTE NORMALIZER
# =========================================================

def normalize_route(route):
    """
    Makes sure every route stop is a dictionary.

    Accepts:
        [
            {"id": "B-140-D", ...}
        ]

    Also accepts:
        [
            '{"id": "B-140-D", ...}'
        ]
    """

    normalized = []

    if not isinstance(route, list):
        return normalized

    for stop in route:

        # Already a dictionary
        if isinstance(stop, dict):
            normalized.append(dict(stop))
            continue

        # JSON string containing a dictionary
        if isinstance(stop, str):

            try:
                parsed = json.loads(stop)

                if isinstance(parsed, dict):
                    normalized.append(parsed)

            except json.JSONDecodeError:
                # If it is simply a bin ID
                normalized.append({
                    "id": stop
                })

    return normalized


# =========================================================
# GET ALL TRUCKS
# =========================================================

def get_all_trucks():
    return load_trucks()


# =========================================================
# GET SINGLE TRUCK
# =========================================================

def get_truck(truck_id):

    trucks = load_trucks()

    for truck in trucks:

        if truck["id"] == truck_id:
            return truck

    return None


# =========================================================
# DISPATCH TRUCK
# =========================================================

def dispatch_truck(truck_id, route):

    trucks = load_trucks()

    # Normalize route first
    route = normalize_route(route)

    for truck in trucks:

        if truck["id"] != truck_id:
            continue

        # ---------------------------------------------
        # RESET TRUCK
        # ---------------------------------------------

        truck["status"] = "en_route"

        truck["route"] = route

        truck["completed"] = []

        truck["load"] = 0

        truck["current_location"] = "Collection Depot"

        # ---------------------------------------------
        # FIRST STOP
        # ---------------------------------------------

        if route:

            first_stop = route[0]

            first_bin = (
                first_stop.get("bin_id")
                or first_stop.get("id")
            )

            truck["current_bin"] = first_bin

        else:

            truck["current_bin"] = None

            truck["status"] = "available"

        truck["last_action"] = datetime.now(
            timezone.utc
        ).isoformat()

        save_trucks(trucks)

        return truck

    return None


# =========================================================
# COMPLETE CURRENT STOP
# =========================================================

def complete_current_stop(truck_id):

    trucks = load_trucks()

    for truck in trucks:

        if truck["id"] != truck_id:
            continue

        current_bin = truck.get("current_bin")

        # ---------------------------------------------
        # NOTHING TO COLLECT
        # ---------------------------------------------

        if not current_bin:

            truck["status"] = "available"

            truck["current_location"] = "Collection Depot"

            save_trucks(trucks)

            return truck

        # ---------------------------------------------
        # FIND CURRENT STOP
        # ---------------------------------------------

        current_stop = None

        for stop in truck.get("route", []):

            if not isinstance(stop, dict):
                continue

            stop_id = (
                stop.get("bin_id")
                or stop.get("id")
            )

            if stop_id == current_bin:

                current_stop = stop
                break

        # ---------------------------------------------
        # REMEMBER LOAD
        # ---------------------------------------------

        collected_level = 0

        if current_stop:

            collected_level = float(
                current_stop.get("level", 0)
            )

        # ---------------------------------------------
        # COLLECT BIN
        # ---------------------------------------------

        collected_bin = collect_bin(current_bin)

        if collected_bin is None:

            return None

        # ---------------------------------------------
        # ADD TO COMPLETED
        # ---------------------------------------------

        if "completed" not in truck:
            truck["completed"] = []

        if current_bin not in truck["completed"]:

            truck["completed"].append(current_bin)

        # ---------------------------------------------
        # UPDATE TRUCK LOAD
        # ---------------------------------------------

        truck["load"] = round(
            float(truck.get("load", 0))
            + collected_level,
            1
        )

        # ---------------------------------------------
        # REMOVE COMPLETED STOP
        # ---------------------------------------------

        remaining_route = []

        for stop in truck.get("route", []):

            if not isinstance(stop, dict):
                continue

            stop_id = (
                stop.get("bin_id")
                or stop.get("id")
            )

            if stop_id != current_bin:
                remaining_route.append(stop)

        truck["route"] = remaining_route

        # ---------------------------------------------
        # NEXT STOP
        # ---------------------------------------------

        if truck["route"]:

            next_stop = truck["route"][0]

            next_bin = (
                next_stop.get("bin_id")
                or next_stop.get("id")
            )

            truck["current_bin"] = next_bin

            truck["current_location"] = (
                next_stop.get("loc")
                or next_bin
            )

            truck["status"] = "en_route"

        # ---------------------------------------------
        # ALL STOPS COMPLETE
        # ---------------------------------------------

        else:

            truck["current_bin"] = None

            truck["current_location"] = "Collection Depot"

            truck["status"] = "returning"

        truck["last_action"] = datetime.now(
            timezone.utc
        ).isoformat()

        save_trucks(trucks)

        return truck

    return None


# =========================================================
# RETURN TO DEPOT
# =========================================================

def return_truck(truck_id):

    trucks = load_trucks()

    for truck in trucks:

        if truck["id"] != truck_id:
            continue

        truck["status"] = "available"

        truck["current_bin"] = None

        truck["current_location"] = "Collection Depot"

        truck["route"] = []

        truck["last_action"] = datetime.now(
            timezone.utc
        ).isoformat()

        save_trucks(trucks)

        return truck

    return None