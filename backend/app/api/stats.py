from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.stats import StatsResponse
from app.services.review_service import ReviewService

router = APIRouter(prefix="/api/stats", tags=["Dashboard Statistics"])

@router.get("", response_model=StatsResponse)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
):
    return await ReviewService.get_stats(db)
