from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.services.demo_service import DemoService
from pydantic import BaseModel

router = APIRouter(tags=["Synthetic Demo Showcase"])


class DemoLoadResponse(BaseModel):
    success: bool
    review_id: str
    project_id: str
    message: str


@router.post(
    "/demo/load",
    response_model=DemoLoadResponse,
    summary="1-Click load of pre-configured CardioVasc demonstration review",
)
async def load_synthetic_demo_review(db: AsyncSession = Depends(get_db)):
    return await DemoService.load_demo_review(db)
