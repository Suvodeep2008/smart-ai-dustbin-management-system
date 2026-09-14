from fastapi import APIRouter, HTTPException, Body

from services.truck_service import (
    get_all_trucks,
    get_truck,
    dispatch_truck,
    complete_current_stop,
    return_truck
)


router = APIRouter(
    prefix="/api/trucks",
    tags=["Trucks"]
)


# ---------------------------------------------------------
# GET ALL TRUCKS
# ---------------------------------------------------------

@router.get("/")
def get_trucks():

    return get_all_trucks()


# ---------------------------------------------------------
# GET SINGLE TRUCK
# ---------------------------------------------------------

@router.get("/{truck_id}")
def get_single_truck(truck_id: str):

    truck = get_truck(truck_id)

    if truck is None:

        raise HTTPException(
            status_code=404,
            detail="Truck not found"
        )

    return truck


# ---------------------------------------------------------
# DISPATCH TRUCK
# ---------------------------------------------------------

@router.post("/{truck_id}/dispatch")
def dispatch(
    truck_id: str,
    route: list = Body(...)
):

    truck = dispatch_truck(
        truck_id,
        route
    )

    if truck is None:

        raise HTTPException(
            status_code=404,
            detail="Truck not found"
        )

    return truck


# ---------------------------------------------------------
# COMPLETE CURRENT STOP
# ---------------------------------------------------------

@router.post("/{truck_id}/complete-stop")
def complete_stop(truck_id: str):

    truck = complete_current_stop(truck_id)

    if truck is None:

        raise HTTPException(
            status_code=404,
            detail="Truck not found"
        )

    return truck


# ---------------------------------------------------------
# RETURN TO DEPOT
# ---------------------------------------------------------

@router.post("/{truck_id}/return")
def return_to_depot(truck_id: str):

    truck = return_truck(truck_id)

    if truck is None:

        raise HTTPException(
            status_code=404,
            detail="Truck not found"
        )

    return truck