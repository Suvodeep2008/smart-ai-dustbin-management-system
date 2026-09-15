from fastapi import APIRouter
from services.bin_service import get_bins

router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard", "Dynamic"]
)


@router.get("/summary")
def dashboard_summary():

    bins = get_bins()

    total_bins = len(bins)

    critical_bins = sum(
        1
        for b in bins
        if float(b.get("level", 0)) >= 85
    )

    needs_collection = sum(
        1
        for b in bins
        if float(b.get("level", 0)) >= 60
    )

    overflow_risk = sum(
        1
        for b in bins
        if float(b.get("level", 0)) >= 80
    )

    average_fill = (
        round(
            sum(
                float(b.get("level", 0))
                for b in bins
            ) / total_bins
        )
        if total_bins > 0
        else 0
    )

    return {
        "total_bins": total_bins,
        "critical_bins": critical_bins,
        "needs_collection": needs_collection,
        "overflow_risk": overflow_risk,
        "average_fill": average_fill
    }