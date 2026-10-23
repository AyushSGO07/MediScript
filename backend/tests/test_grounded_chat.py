import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from app.main import app
from app.db.init_db import init_db
from app.db.session import AsyncSessionLocal
from app.models.workspace import Workspace
from app.models.project import Project
from app.models.review import Review
from app.models.document import Document, TextBlock
from app.services.grounded_chat_service import GroundedChatService


@pytest.fixture(autouse=True)
def setup_db():
    init_db()


async def create_chat_review_helper() -> str:
    async with AsyncSessionLocal() as session:
        ws_res = await session.execute(select(Workspace))
        ws = ws_res.scalars().first()
        ws_id = ws.id if ws else "default-workspace"

        proj_id = f"proj-chat-{uuid.uuid4().hex[:8]}"
        project = Project(
            id=proj_id,
            workspace_id=ws_id,
            name="Chat Test Project",
            description="Testing Grounded Chat RAG",
        )
        session.add(project)
        await session.commit()

        doc_id = f"doc-chat-{uuid.uuid4().hex[:8]}"
        doc = Document(
            id=doc_id,
            project_id=proj_id,
            role="revised",
            filename="cardiovasc_revised.pdf",
            original_filename="cardiovasc_revised.pdf",
            file_size_bytes=1024,
            mime_type="application/pdf",
            sha256="abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
            storage_path="/tmp/cardiovasc_revised.pdf",
            page_count=1,
            has_text_layer=True,
            upload_status="uploaded",
            extraction_status="completed",
        )
        session.add(doc)

        # Add text blocks
        b1 = TextBlock(
            id=f"tb-{uuid.uuid4().hex[:8]}",
            document_id=doc_id,
            page_number=1,
            block_index=0,
            text="CardioVasc Everolimus-Eluting Coronary Stent System. REF: CV-9020. LOT: 2024A.",
            x0=72.0, y0=72.0, x1=300.0, y1=100.0,
            norm_x0=0.1, norm_y0=0.1, norm_x1=0.5, norm_y1=0.15,
        )
        b2 = TextBlock(
            id=f"tb-{uuid.uuid4().hex[:8]}",
            document_id=doc_id,
            page_number=1,
            block_index=1,
            text="Store between 2°C and 8°C. Do not freeze. Keep dry.",
            x0=72.0, y0=110.0, x1=300.0, y1=130.0,
            norm_x0=0.1, norm_y0=0.18, norm_x1=0.5, norm_y1=0.22,
        )
        b3 = TextBlock(
            id=f"tb-{uuid.uuid4().hex[:8]}",
            document_id=doc_id,
            page_number=1,
            block_index=2,
            text="STERILE EO. Use by: 2028-12-31. Single use only. Rx Only.",
            x0=72.0, y0=140.0, x1=300.0, y1=160.0,
            norm_x0=0.1, norm_y0=0.25, norm_x1=0.5, norm_y1=0.30,
        )
        session.add_all([b1, b2, b3])

        rev_id = f"rev-chat-{uuid.uuid4().hex[:8]}"
        review = Review(
            id=rev_id,
            project_id=proj_id,
            name="Chat Test Review",
            status="In Progress",
            revised_document_id=doc_id,
        )
        session.add(review)
        await session.commit()

        return rev_id


@pytest.mark.asyncio
async def test_grounded_chat_answering_with_citations():
    """Verify chat answers questions present in document with exact [p. X, block Y] citations (AIAS-03)."""
    rev_id = await create_chat_review_helper()
    async with AsyncSessionLocal() as session:
        resp = await GroundedChatService.answer_query(
            db=session,
            review_id=rev_id,
            query="What are the storage temperature requirements?",
            document_role="revised",
        )

        assert not resp.is_abstained
        assert resp.engine == "deterministic"
        assert len(resp.citations) > 0
        assert "[p. 1, block 1]" in resp.answer
        assert "2°C and 8°C" in resp.answer

        # Coordinate checks
        cit = resp.citations[0]
        assert cit.page_number == 1
        assert cit.block_index == 1
        assert cit.norm_x0 == 0.1
        assert cit.norm_y0 == 0.18


@pytest.mark.asyncio
async def test_grounded_chat_expiration_query():
    """Verify query for expiration date retrieves sterility block with citation (AIAS-03)."""
    rev_id = await create_chat_review_helper()
    async with AsyncSessionLocal() as session:
        resp = await GroundedChatService.answer_query(
            db=session,
            review_id=rev_id,
            query="When does this product expire?",
            document_role="revised",
        )

        assert not resp.is_abstained
        assert "[p. 1, block 2]" in resp.answer
        assert "2028-12-31" in resp.answer


@pytest.mark.asyncio
async def test_grounded_chat_abstention_on_missing_parameter():
    """Verify zero-hallucination abstention when parameter is absent from document (AIAS-04)."""
    rev_id = await create_chat_review_helper()
    async with AsyncSessionLocal() as session:
        resp = await GroundedChatService.answer_query(
            db=session,
            review_id=rev_id,
            query="What are the pediatric guidelines and dosage instructions?",
            document_role="revised",
        )

        assert resp.is_abstained
        assert len(resp.citations) == 0
        assert "no evidence was found" in resp.answer.lower()
        assert "pediatric" in resp.answer.lower()


@pytest.mark.asyncio
async def test_grounded_chat_api_endpoint():
    """Verify POST /api/reviews/{review_id}/chat endpoint works end-to-end."""
    rev_id = await create_chat_review_helper()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post(
            f"/api/reviews/{rev_id}/chat",
            json={
                "query": "Is this device sterile?",
                "document_role": "revised",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["is_abstained"] is False
        assert len(data["citations"]) > 0
        assert "[p. 1, block 2]" in data["answer"]
        assert "STERILE EO" in data["answer"]
