import pytest
from pathlib import Path
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from app.main import app
from app.db.init_db import init_db
from app.db.session import AsyncSessionLocal
from app.services.demo_service import DemoService
from app.models.review import Review
from app.models.diff_item import DiffItem
from app.models.finding import Finding


@pytest.fixture(autouse=True)
def setup_db():
    init_db()


def test_generate_synthetic_labels():
    """Verify synthetic baseline and revised medical label PDFs are generated (DEMO-01)."""
    base_path, rev_path = DemoService.generate_synthetic_labels()

    assert base_path.exists()
    assert rev_path.exists()

    with open(base_path, "rb") as f:
        base_header = f.read(4)
        assert base_header == b"%PDF"

    with open(rev_path, "rb") as f:
        rev_header = f.read(4)
        assert rev_header == b"%PDF"


@pytest.mark.asyncio
async def test_load_demo_review_end_to_end():
    """Verify 1-click synthetic demo review loader provisions complete review session (DEMO-03)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.post("/api/demo/load")
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert "review_id" in data
        assert "project_id" in data
        review_id = data["review_id"]

        # Check Review state in DB
        async with AsyncSessionLocal() as session:
            r_stmt = select(Review).where(Review.id == review_id)
            r_res = await session.execute(r_stmt)
            review = r_res.scalar_one_or_none()
            assert review is not None
            assert review.baseline_document_id is not None
            assert review.revised_document_id is not None

            # Verify diffs were computed
            d_stmt = select(DiffItem).where(DiffItem.review_id == review_id)
            d_res = await session.execute(d_stmt)
            diffs = d_res.scalars().all()
            assert len(diffs) > 0

            # Verify compliance findings were evaluated
            f_stmt = select(Finding).where(Finding.review_id == review_id)
            f_res = await session.execute(f_stmt)
            findings = f_res.scalars().all()
            assert len(findings) > 0


@pytest.mark.asyncio
async def test_load_demo_review_idempotency():
    """Verify calling /api/demo/load repeatedly returns existing review without corruption (DEMO-03)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res1 = await client.post("/api/demo/load")
        assert res1.status_code == 200
        rev1 = res1.json()["review_id"]

        res2 = await client.post("/api/demo/load")
        assert res2.status_code == 200
        rev2 = res2.json()["review_id"]

        assert rev1 == rev2
