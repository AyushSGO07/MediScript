import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.ai_assistance_service import AIAssistanceService
from app.schemas.ai_assistance import CandidateEntitySuggestion, ClinicalImpactSummary
from app.services.diff_engine import DiffCategory, DiffType


@pytest.mark.asyncio
async def test_suggest_entities_deterministic():
    """Verify extraction assistant suggests valid candidate entities with coordinates (AIAS-01, AIAS-05)."""
    blocks = [
        {
            "id": "blk-1",
            "text": "CardioVasc MedTech Inc. REF: CV-9020 LOT: 2024A",
            "page_number": 1,
            "block_index": 0,
            "norm_x0": 0.1,
            "norm_y0": 0.1,
            "norm_x1": 0.5,
            "norm_y1": 0.15,
        },
        {
            "id": "blk-2",
            "text": "Use by: 2028-12-31 STERILE EO CE 0123",
            "page_number": 1,
            "block_index": 1,
            "norm_x0": 0.1,
            "norm_y0": 0.2,
            "norm_x1": 0.6,
            "norm_y1": 0.25,
        },
        {
            "id": "blk-3",
            "text": "(01)00840123456789(17)281231(10)2024A",
            "page_number": 1,
            "block_index": 2,
            "norm_x0": 0.1,
            "norm_y0": 0.3,
            "norm_x1": 0.7,
            "norm_y1": 0.35,
        },
    ]

    suggestions = AIAssistanceService.suggest_entities(blocks)
    assert len(suggestions) > 0
    assert all(isinstance(s, CandidateEntitySuggestion) for s in suggestions)

    keys = [s.field_key for s in suggestions]
    assert "expiration_date" in keys or "model_ref" in keys or "udi_full" in keys

    exp_sugg = next((s for s in suggestions if s.field_key == "expiration_date"), None)
    if exp_sugg:
        assert exp_sugg.suggested_value == "2028-12-31"
        assert exp_sugg.page_number == 1
        assert exp_sugg.norm_x0 == 0.1
        assert exp_sugg.confidence_score > 0.5


def test_clinical_impact_dates_high_risk():
    """Verify revision analysis categorizes expiration date diff as High risk with sterility impact (AIAS-02)."""
    impact = AIAssistanceService.analyze_diff_clinical_impact(
        change_type=DiffType.MODIFIED,
        category=DiffCategory.DATES,
        baseline_text="2028-12-31",
        revised_text="2029-06-30",
        diff_id="diff-dates-1",
    )

    assert isinstance(impact, ClinicalImpactSummary)
    assert impact.clinical_risk == "High"
    assert "sterility" in impact.regulatory_implication.lower()
    assert "2028-12-31" in impact.plain_language_summary
    assert "ISO 11607" in impact.suggested_action


def test_clinical_impact_storage_medium_risk():
    """Verify revision analysis categorizes storage temperature change as Medium risk (AIAS-02)."""
    impact = AIAssistanceService.analyze_diff_clinical_impact(
        change_type=DiffType.MODIFIED,
        category="Storage",
        baseline_text="Store between 2°C and 8°C. Do not freeze.",
        revised_text="Store between 15°C and 25°C.",
        diff_id="diff-storage-1",
    )

    assert impact.clinical_risk == "Medium"
    assert "degradation" in impact.regulatory_implication.lower() or "thermal" in impact.regulatory_implication.lower()
    assert "cold chain" in impact.suggested_action.lower() or "iso 15223-1" in impact.suggested_action.lower()


def test_clinical_impact_warnings_high_risk():
    """Verify revision analysis categorizes safety warnings as High risk (AIAS-02)."""
    impact = AIAssistanceService.analyze_diff_clinical_impact(
        change_type=DiffType.DELETED,
        category=DiffCategory.SAFETY,
        baseline_text="Rx Only. Single use only. Do not resterilize.",
        revised_text=None,
        diff_id="diff-safety-1",
    )

    assert impact.clinical_risk == "High"
    assert "risk classification" in impact.regulatory_implication.lower() or "iso 14971" in impact.regulatory_implication.lower()


def test_clinical_impact_manufacturer_low_risk():
    """Verify revision analysis categorizes corporate address change as Low risk (AIAS-02)."""
    impact = AIAssistanceService.analyze_diff_clinical_impact(
        change_type=DiffType.MODIFIED,
        category=DiffCategory.MANUFACTURER,
        baseline_text="450 Medical Way, Minneapolis, MN 55401 USA",
        revised_text="Suite 900, Chicago, IL 60601 USA",
        diff_id="diff-mfg-1",
    )

    assert impact.clinical_risk == "Low"
    assert "address" in impact.plain_language_summary.lower()


@pytest.mark.asyncio
async def test_assistance_diff_impact_endpoint():
    """Verify POST /api/assistance/diff-impact endpoint returns valid structured analysis."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        res = await ac.post(
            "/api/assistance/diff-impact",
            json={
                "change_type": "MODIFIED",
                "category": "Dates",
                "baseline_text": "2028-12-31",
                "revised_text": "2030-01-01",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["clinical_risk"] == "High"
        assert "diff_id" in data
        assert "regulatory_implication" in data
        assert "plain_language_summary" in data
        assert "suggested_action" in data
