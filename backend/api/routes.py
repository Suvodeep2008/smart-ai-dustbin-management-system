from fastapi import APIRouter
from services.route_service import build_route

router = APIRouter(prefix="/api/routes", tags=["Routes"])

@router.get("/{waste_type}")
def route(waste_type: str):
    return build_route(waste_type)
