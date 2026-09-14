from fastapi import APIRouter, HTTPException

from services.bin_service import (
    get_bins,
    get_bin,
    collect_bin,
    simulate_fill
)


router = APIRouter(
    prefix="/api/bins",
    tags=["Bins"]
)


@router.get("")
def list_bins():
    return get_bins()


# IMPORTANT:
# This static route is declared before /{bin_id}
# so "simulate-fill" is not interpreted as a bin ID.
@router.post("/simulate-fill")
def automatic_fill(
    seconds: float = 5.0,
    multiplier: float = 300.0
):
    return simulate_fill(
        seconds=seconds,
        multiplier=multiplier
    )


@router.get("/{bin_id}")
def read_bin(bin_id: str):

    result = get_bin(bin_id)

    if not result:
        raise HTTPException(
            status_code=404,
            detail="Bin not found"
        )

    return result


@router.post("/{bin_id}/collect")
def collect(bin_id: str):

    result = collect_bin(bin_id)

    if not result:
        raise HTTPException(
            status_code=404,
            detail="Bin not found"
        )

    return {
        "message": f"{bin_id} collected successfully",
        "bin": result
    }
