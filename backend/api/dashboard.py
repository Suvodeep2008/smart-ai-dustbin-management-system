from fastapi import APIRouter

router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"]
)


@router.get("/summary")
def dashboard_summary():

    return {
        "total_bins": 16,
        "critical_bins": 3,
        "needs_collection": 7,
        "overflow_risk": 4,
        "average_fill": 52
    }