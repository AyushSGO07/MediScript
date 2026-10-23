from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.schemas.chat import ChatMessageRequest, ChatMessageResponse
from app.services.grounded_chat_service import GroundedChatService

router = APIRouter(tags=["Grounded Review Chat"])


@router.post(
    "/reviews/{review_id}/chat",
    response_model=ChatMessageResponse,
    summary="Query label documentation with bracketed citations and strict abstention",
)
async def query_review_chat(
    review_id: str,
    payload: ChatMessageRequest,
    db: AsyncSession = Depends(get_db),
):
    return await GroundedChatService.answer_query(
        db=db,
        review_id=review_id,
        query=payload.query,
        document_role=payload.document_role or "revised",
    )
