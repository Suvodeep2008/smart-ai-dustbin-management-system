# ============================================================
# SMART WASTE AI
# ROUTE OPTIMIZATION SERVICE
# ============================================================

from math import hypot

from .bin_service import get_bins
from .priority_service import calculate_priority


# ============================================================
# COLLECTION DEPOT
# ============================================================

DEPOT = {
    "x": 120,
    "y": 60,
    "label": "Collection Depot"
}


# ============================================================
# VEHICLE SETTINGS
# ============================================================

KM_PER_UNIT = 0.045
TRUCK_SPEED_KMH = 22


# ============================================================
# DISTANCE
# ============================================================

def distance(point_a, point_b):
    """
    Calculate distance between two points.
    """

    return hypot(
        float(point_a.get("x", 0))
        - float(point_b.get("x", 0)),

        float(point_a.get("y", 0))
        - float(point_b.get("y", 0))
    )


# ============================================================
# STATUS
# ============================================================

def get_bin_status(bin_data):
    """
    Calculate the current status directly from fill level.
    """

    level = float(
        bin_data.get("level", 0)
    )

    if level >= 85:
        return "critical"

    if level >= 60:
        return "warning"

    return "normal"


# ============================================================
# WASTE TYPE
# ============================================================

def get_waste_type(bin_data):
    """
    Read the waste type safely.

    Supports the possible field names used by
    different versions of the project.
    """

    return (
        bin_data.get("type")
        or bin_data.get("wasteType")
        or bin_data.get("waste_type")
        or ""
    ).lower().strip()


# ============================================================
# COLLECTION CANDIDATES
# ============================================================

def get_collection_candidates(waste_type):
    """
    Get all non-empty bins that require collection.
    """

    candidates = []

    all_bins = get_bins()

    for bin_data in all_bins:

        # ----------------------------------------------------
        # Check waste type
        # ----------------------------------------------------

        current_type = get_waste_type(
            bin_data
        )

        if current_type != waste_type:
            continue

        # ----------------------------------------------------
        # Check fill level
        # ----------------------------------------------------

        level = float(
            bin_data.get("level", 0)
        )

        # Empty bin does not need collection
        if level <= 0:
            continue

        # ----------------------------------------------------
        # Calculate status from level
        # ----------------------------------------------------

        status = get_bin_status(
            bin_data
        )

        # Only warning and critical bins
        if status == "normal":
            continue

        # ----------------------------------------------------
        # Add calculated status
        # ----------------------------------------------------

        candidate = dict(bin_data)

        candidate["status"] = status

        candidates.append(
            candidate
        )

    return candidates


# ============================================================
# ROUTE SCORE
# ============================================================

def calculate_route_score(
    bin_data,
    current_position
):
    """
    Calculate the score for selecting the next bin.

    AI priority is the main factor.
    Distance is used as a penalty.

    Higher score = better next stop.
    """

    priority = float(
        calculate_priority(bin_data)
    )

    distance_units = distance(
        current_position,
        bin_data
    )

    # Small distance penalty
    distance_penalty = (
        distance_units * 0.15
    )

    score = (
        priority
        - distance_penalty
    )

    return score


# ============================================================
# ROUTE OPTIMIZATION
# ============================================================

def optimize_route(candidates):
    """
    Build an optimized route.

    The truck starts at the depot.

    At every step the system considers:
        1. AI priority
        2. Distance from current position

    The highest scoring bin becomes the next stop.
    """

    remaining = list(
        candidates
    )

    route = []

    current_position = DEPOT

    while remaining:

        best_bin = None
        best_score = None

        # ----------------------------------------------------
        # Find best next stop
        # ----------------------------------------------------

        for bin_data in remaining:

            score = calculate_route_score(
                bin_data,
                current_position
            )

            if (
                best_score is None
                or score > best_score
            ):
                best_score = score
                best_bin = bin_data

        # Safety check
        if best_bin is None:
            break

        # ----------------------------------------------------
        # Calculate AI priority
        # ----------------------------------------------------

        priority_score = calculate_priority(
            best_bin
        )

        # ----------------------------------------------------
        # Create route record
        # ----------------------------------------------------

        route_bin = dict(
            best_bin
        )

        route_bin["priority_score"] = round(
            priority_score,
            2
        )

        route_bin["route_score"] = round(
            best_score,
            2
        )

        route.append(
            route_bin
        )

        # ----------------------------------------------------
        # Truck moves to selected bin
        # ----------------------------------------------------

        current_position = best_bin

        # Remove selected bin
        remaining.remove(
            best_bin
        )

    return route


# ============================================================
# ROUTE METRICS
# ============================================================

def calculate_route_metrics(route):
    """
    Calculate total distance and estimated travel time.
    """

    # No stops
    if not route:

        return {
            "distanceKm": 0,
            "timeMinutes": 0,
            "points": [DEPOT]
        }

    # Depot → bins → depot
    points = (
        [DEPOT]
        + route
        + [DEPOT]
    )

    total_units = 0

    for index in range(
        len(points) - 1
    ):

        total_units += distance(
            points[index],
            points[index + 1]
        )

    # Convert coordinate distance to kilometres
    total_km = (
        total_units
        * KM_PER_UNIT
    )

    # Calculate travel time
    if total_km > 0:

        time_minutes = round(
            (
                total_km
                / TRUCK_SPEED_KMH
            )
            * 60
        )

    else:

        time_minutes = 0

    return {
        "distanceKm": round(
            total_km,
            1
        ),

        "timeMinutes": time_minutes,

        "points": points
    }


# ============================================================
# BUILD ROUTE
# ============================================================

def build_route(waste_type):
    """
    Build the complete optimized collection route.

    Supported:
        degradable
        non-degradable
    """

    waste_type = (
        waste_type
        .lower()
        .strip()
    )

    # --------------------------------------------------------
    # 1. Get eligible bins
    # --------------------------------------------------------

    candidates = get_collection_candidates(
        waste_type
    )

    # --------------------------------------------------------
    # 2. Optimize route
    # --------------------------------------------------------

    route = optimize_route(
        candidates
    )

    # --------------------------------------------------------
    # 3. Calculate distance/time
    # --------------------------------------------------------

    metrics = calculate_route_metrics(
        route
    )

    # --------------------------------------------------------
    # 4. Assign truck
    # --------------------------------------------------------

    if waste_type == "degradable":

        truck_id = "GRN-01"

    else:

        truck_id = "BLU-02"

    # --------------------------------------------------------
    # 5. Return API response
    # --------------------------------------------------------

    return {
        "wasteType": waste_type,

        "truckId": truck_id,

        "stops": route,

        "stopCount": len(route),

        "distanceKm": metrics[
            "distanceKm"
        ],

        "timeMinutes": metrics[
            "timeMinutes"
        ],

        "depot": DEPOT,

        "points": metrics[
            "points"
        ]
    }