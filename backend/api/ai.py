from fastapi import APIRouter, HTTPException

from services.bin_service import get_bin

from services.prediction_service import (
    predict_fill_time
)

from services.priority_service import (
    calculate_priority
)


router = APIRouter(
    prefix="/api/ai",
    tags=["AI"]
)


@router.get("/predict/{bin_id}")
def predict_bin(bin_id: str):

    # ------------------------------------------------
    # Get bin data
    # ------------------------------------------------

    bin_data = get_bin(bin_id)

    if not bin_data:
        raise HTTPException(
            status_code=404,
            detail="Bin not found"
        )

    # ------------------------------------------------
    # AI fill prediction
    # ------------------------------------------------

    prediction = predict_fill_time(
        bin_data["level"],
        bin_data["rateHr"]
    )

    # ------------------------------------------------
    # AI priority calculation
    # ------------------------------------------------

    priority = calculate_priority(bin_data)

    # ------------------------------------------------
    # Return complete AI response
    # ------------------------------------------------

    return {
        "bin_id": bin_data["id"],
        "current_level": bin_data["level"],
        "fill_rate": bin_data["rateHr"],

        "prediction": prediction,

        "priority_score": priority
    }