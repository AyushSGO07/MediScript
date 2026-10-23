import pytest
import pytest_asyncio
from sqlalchemy import select
from pydantic import ValidationError
from app.db.session import AsyncSessionLocal
from app.models.checklist import (
    Checklist,
    ChecklistVersion,
    ChecklistRule,
    SeverityLevel,
    RuleType,
    VersionStatus,
)
from app.schemas.checklist import (
    ChecklistCreate,
    ChecklistRuleCreate,
    ChecklistRuleUpdate,
    ChecklistVersionCreate,
    CloneVersionRequest,
)


@pytest.mark.asyncio
async def test_checklist_model_creation_and_cascades():
    async with AsyncSessionLocal() as db:
        # Create checklist
        checklist = Checklist(
            name="Test FDA Standard",
            jurisdiction="FDA (US)",
            source_reference="21 CFR 801.20",
            description="Test medical device rules",
            is_demonstration=True,
        )
        db.add(checklist)
        await db.commit()
        await db.refresh(checklist)

        assert checklist.id is not None
        assert checklist.name == "Test FDA Standard"
        assert checklist.is_demonstration is True

        # Add a version
        version = ChecklistVersion(
            checklist_id=checklist.id,
            version="v1.0.0",
            status=VersionStatus.PUBLISHED,
            effective_date="2024-01-01",
            changelog_summary="Initial version",
            created_by="Lead Reviewer",
        )
        db.add(version)
        await db.commit()
        await db.refresh(version)

        assert version.id is not None
        assert version.status == VersionStatus.PUBLISHED

        # Add rules to this version
        rule1 = ChecklistRule(
            checklist_version_id=version.id,
            rule_key="FDA_UDI_REQUIRED",
            field_key="udi_di",
            description="UDI DI must be present",
            severity=SeverityLevel.CRITICAL,
            rule_type=RuleType.REQUIRED_PRESENCE,
            enabled=True,
        )
        rule2 = ChecklistRule(
            checklist_version_id=version.id,
            rule_key="FDA_EXP_FORMAT",
            field_key="expiration_date",
            description="Expiry must be ISO",
            severity=SeverityLevel.MAJOR,
            rule_type=RuleType.FORMAT_REGEX,
            expected_value=r"^\d{4}-\d{2}-\d{2}$",
            enabled=True,
        )
        db.add_all([rule1, rule2])
        await db.commit()
        # Query rules for this version
        rules_q = await db.execute(
            select(ChecklistRule).where(ChecklistRule.checklist_version_id == version.id)
        )
        assert len(rules_q.scalars().all()) == 2

        # Delete checklist and ensure cascades work
        await db.delete(checklist)
        await db.commit()

        # Verify version and rules were deleted
        v_check = await db.execute(
            select(ChecklistVersion).where(ChecklistVersion.id == version.id)
        )
        assert v_check.scalar_one_or_none() is None

        r_check = await db.execute(
            select(ChecklistRule).where(ChecklistRule.checklist_version_id == version.id)
        )
        assert len(r_check.scalars().all()) == 0


def test_checklist_rule_schema_validation():
    # Valid rule
    rule_data = ChecklistRuleCreate(
        rule_key="TEST_RULE",
        field_key="lot_batch",
        description="Lot number must be specified",
        severity="critical",  # Should normalize to 'Critical'
        rule_type="required_presence",  # Should normalize to 'REQUIRED_PRESENCE'
    )
    assert rule_data.severity == "Critical"
    assert rule_data.rule_type == "REQUIRED_PRESENCE"

    # Invalid severity
    with pytest.raises(ValidationError):
        ChecklistRuleCreate(
            rule_key="BAD_SEVERITY",
            field_key="lot_batch",
            description="Test",
            severity="Blocker",  # Not in Critical, Major, Minor
            rule_type="REQUIRED_PRESENCE",
        )

    # Invalid rule type
    with pytest.raises(ValidationError):
        ChecklistRuleCreate(
            rule_key="BAD_TYPE",
            field_key="lot_batch",
            description="Test",
            severity="Major",
            rule_type="UNKNOWN_RULE_TYPE",
        )


def test_checklist_version_schema_validation():
    # Valid status
    v = ChecklistVersionCreate(
        version="v1.0.0",
        status="published",
    )
    assert v.status == "published"

    # Invalid status
    with pytest.raises(ValidationError):
        ChecklistVersionCreate(
            version="v1.0.0",
            status="archived_forever",
        )

    # Clone version request
    clone_req = CloneVersionRequest(
        target_version="v2.0.0",
        changelog_summary="Updated for MDR 2024 updates",
        copy_rules=True,
    )
    assert clone_req.target_version == "v2.0.0"
    assert clone_req.copy_rules is True
