from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException

from app.models.checklist import (
    Checklist,
    ChecklistVersion,
    ChecklistRule,
    SeverityLevel,
    RuleType,
    VersionStatus,
)
from app.models.review import Review
from app.schemas.checklist import (
    ChecklistCreate,
    ChecklistUpdate,
    ChecklistResponse,
    ChecklistDetailResponse,
    ChecklistVersionCreate,
    ChecklistVersionResponse,
    ChecklistVersionDetailResponse,
    ChecklistRuleCreate,
    ChecklistRuleUpdate,
    ChecklistRuleResponse,
)


class ChecklistService:

    @classmethod
    async def is_version_locked(cls, db: AsyncSession, version_id: str) -> Tuple[bool, str]:
        """
        Determines whether a ChecklistVersion is locked / immutable.
        Returns (is_locked, reason).
        """
        # Check version status
        v_res = await db.execute(
            select(ChecklistVersion).where(ChecklistVersion.id == version_id)
        )
        version = v_res.scalar_one_or_none()
        if not version:
            raise HTTPException(status_code=404, detail="Checklist version not found")

        if version.status in (VersionStatus.PUBLISHED, VersionStatus.DEPRECATED):
            return True, f"Checklist version is {version.status} and cannot be modified. Clone as a new draft version to make changes."

        # Check if bound to any review
        r_res = await db.execute(
            select(func.count()).select_from(Review).where(Review.checklist_version_id == version_id)
        )
        count = r_res.scalar() or 0
        if count > 0:
            return True, f"Checklist version is bound to {count} review record(s) and cannot be modified."

        return False, ""

    @classmethod
    async def seed_demonstration_checklists(cls, db: AsyncSession):
        """
        Idempotently seeds demonstration checklists for FDA, EU MDR, and ISO 20417.
        """
        q = await db.execute(
            select(Checklist).where(Checklist.name == "FDA 21 CFR 801/830 Medical Device Labeling Demonstration")
        )
        existing = q.scalar_one_or_none()
        if existing:
            return  # Already seeded

        # 1. FDA 21 CFR 801/830
        fda = Checklist(
            name="FDA 21 CFR 801/830 Medical Device Labeling Demonstration",
            jurisdiction="FDA (US)",
            source_reference="21 CFR Part 801 Subpart B & Part 830",
            description="Demonstration requirements for US FDA Unique Device Identification (UDI) and medical device labeling compliance.",
            is_demonstration=True,
        )
        db.add(fda)
        await db.flush()

        fda_v1 = ChecklistVersion(
            checklist_id=fda.id,
            version="v1.0.0",
            status=VersionStatus.PUBLISHED,
            effective_date="2024-01-01",
            changelog_summary="Initial demonstration release baseline",
            created_by="FDA Demonstration Seed",
        )
        db.add(fda_v1)
        await db.flush()

        fda_rules = [
            ChecklistRule(
                checklist_version_id=fda_v1.id,
                rule_key="FDA_UDI_DI_REQUIRED",
                field_key="udi_di",
                description="Unique Device Identifier (UDI) Device Identifier (DI) must be present on label under 21 CFR 801.20.",
                severity=SeverityLevel.CRITICAL,
                rule_type=RuleType.REQUIRED_PRESENCE,
                enabled=True,
            ),
            ChecklistRule(
                checklist_version_id=fda_v1.id,
                rule_key="FDA_EXP_DATE_ISO",
                field_key="expiration_date",
                description="Expiration date must be present and valid under 21 CFR 801.18.",
                severity=SeverityLevel.CRITICAL,
                rule_type=RuleType.DATE_EXPIRATION,
                enabled=True,
            ),
            ChecklistRule(
                checklist_version_id=fda_v1.id,
                rule_key="FDA_MFG_NAME_REQ",
                field_key="manufacturer_name",
                description="Legal manufacturer or distributor name must appear prominently under 21 CFR 801.1.",
                severity=SeverityLevel.MAJOR,
                rule_type=RuleType.REQUIRED_PRESENCE,
                enabled=True,
            ),
            ChecklistRule(
                checklist_version_id=fda_v1.id,
                rule_key="FDA_MFG_ADDR_REQ",
                field_key="manufacturer_address",
                description="Business address of legal manufacturer must include city, state, zip, and country under 21 CFR 801.1.",
                severity=SeverityLevel.MAJOR,
                rule_type=RuleType.REQUIRED_PRESENCE,
                enabled=True,
            ),
            ChecklistRule(
                checklist_version_id=fda_v1.id,
                rule_key="FDA_MODEL_REF_REQ",
                field_key="model_ref",
                description="Device catalog or model reference number must be clearly stated.",
                severity=SeverityLevel.MAJOR,
                rule_type=RuleType.REQUIRED_PRESENCE,
                enabled=True,
            ),
            ChecklistRule(
                checklist_version_id=fda_v1.id,
                rule_key="FDA_LOT_BATCH_REQ",
                field_key="lot_batch",
                description="Lot or batch identification number must be clearly marked under 21 CFR 801.20.",
                severity=SeverityLevel.CRITICAL,
                rule_type=RuleType.REQUIRED_PRESENCE,
                enabled=True,
            ),
            ChecklistRule(
                checklist_version_id=fda_v1.id,
                rule_key="FDA_RX_ONLY_STMT",
                field_key="rx_only",
                description="Prescription-only legend ('Caution: Federal law restricts...' or 'Rx Only') must be present under 21 CFR 801.109.",
                severity=SeverityLevel.MAJOR,
                rule_type=RuleType.REQUIRED_PRESENCE,
                enabled=True,
            ),
            ChecklistRule(
                checklist_version_id=fda_v1.id,
                rule_key="FDA_WARNINGS_REQ",
                field_key="warnings",
                description="Adequate warnings and contraindications must appear under 21 CFR 801.5.",
                severity=SeverityLevel.MAJOR,
                rule_type=RuleType.REQUIRED_PRESENCE,
                enabled=True,
            ),
        ]
        db.add_all(fda_rules)

        # 2. EU MDR 2017/745
        mdr = Checklist(
            name="EU MDR 2017/745 Annex I Demonstration Checklist",
            jurisdiction="EU MDR (EU)",
            source_reference="Regulation (EU) 2017/745, Annex I, Chapter III (Section 23)",
            description="Demonstration requirements for General Safety and Performance Requirements (GSPR) labeling under EU MDR.",
            is_demonstration=True,
        )
        db.add(mdr)
        await db.flush()

        mdr_v1 = ChecklistVersion(
            checklist_id=mdr.id,
            version="v1.0.0",
            status=VersionStatus.PUBLISHED,
            effective_date="2021-05-26",
            changelog_summary="Initial demonstration release baseline",
            created_by="EU MDR Demonstration Seed",
        )
        db.add(mdr_v1)
        await db.flush()

        mdr_rules = [
            ChecklistRule(
                checklist_version_id=mdr_v1.id,
                rule_key="MDR_CE_MARK_REQ",
                field_key="ce_mark",
                description="CE conformity marking must appear visibly and legibly on device packaging (Annex I, 23.2.e).",
                severity=SeverityLevel.CRITICAL,
                rule_type=RuleType.REQUIRED_PRESENCE,
                enabled=True,
            ),
            ChecklistRule(
                checklist_version_id=mdr_v1.id,
                rule_key="MDR_NOTIFIED_BODY",
                field_key="notified_body_id",
                description="4-digit Notified Body identification number must accompany the CE mark for Class IIa/IIb/III devices.",
                severity=SeverityLevel.CRITICAL,
                rule_type=RuleType.FORMAT_REGEX,
                expected_value=r"^\d{4}$",
                enabled=True,
            ),
            ChecklistRule(
                checklist_version_id=mdr_v1.id,
                rule_key="MDR_UDI_CARRIER",
                field_key="udi_di",
                description="UDI Carrier containing Device Identifier (DI) must appear on the device label (Annex I, 23.2.c).",
                severity=SeverityLevel.CRITICAL,
                rule_type=RuleType.REQUIRED_PRESENCE,
                enabled=True,
            ),
            ChecklistRule(
                checklist_version_id=mdr_v1.id,
                rule_key="MDR_EXPIRY_DATE",
                field_key="expiration_date",
                description="Date until which the device may be safely used must be stated (Annex I, 23.2.i).",
                severity=SeverityLevel.CRITICAL,
                rule_type=RuleType.DATE_EXPIRATION,
                enabled=True,
            ),
            ChecklistRule(
                checklist_version_id=mdr_v1.id,
                rule_key="MDR_STERILE_STATE",
                field_key="sterile",
                description="Indication of sterile state and sterilization method must be present for sterile devices (Annex I, 23.2.k).",
                severity=SeverityLevel.MAJOR,
                rule_type=RuleType.REQUIRED_PRESENCE,
                enabled=True,
            ),
            ChecklistRule(
                checklist_version_id=mdr_v1.id,
                rule_key="MDR_SINGLE_USE",
                field_key="single_use",
                description="Clear indication that the device is intended for single use must be provided (Annex I, 23.2.l).",
                severity=SeverityLevel.MAJOR,
                rule_type=RuleType.REQUIRED_PRESENCE,
                enabled=True,
            ),
            ChecklistRule(
                checklist_version_id=mdr_v1.id,
                rule_key="MDR_STORAGE_COND",
                field_key="storage_conditions",
                description="Special storage and/or handling conditions must be specified (Annex I, 23.2.j).",
                severity=SeverityLevel.MINOR,
                rule_type=RuleType.REQUIRED_PRESENCE,
                enabled=True,
            ),
        ]
        db.add_all(mdr_rules)

        # 3. ISO 20417
        iso = Checklist(
            name="ISO 20417 Medical Device Information Demonstration",
            jurisdiction="ISO (Global)",
            source_reference="ISO 20417:2021 Clause 5 & 6",
            description="Demonstration rules for international medical device information to be supplied by the manufacturer.",
            is_demonstration=True,
        )
        db.add(iso)
        await db.flush()

        iso_v1 = ChecklistVersion(
            checklist_id=iso.id,
            version="v1.0.0",
            status=VersionStatus.PUBLISHED,
            effective_date="2021-04-01",
            changelog_summary="Initial demonstration release baseline",
            created_by="ISO Demonstration Seed",
        )
        db.add(iso_v1)
        await db.flush()

        iso_rules = [
            ChecklistRule(
                checklist_version_id=iso_v1.id,
                rule_key="ISO_MFG_DETAILS",
                field_key="manufacturer_name",
                description="Legal manufacturer identity must be clearly expressed.",
                severity=SeverityLevel.MAJOR,
                rule_type=RuleType.REQUIRED_PRESENCE,
                enabled=True,
            ),
            ChecklistRule(
                checklist_version_id=iso_v1.id,
                rule_key="ISO_COUNTRY_ORIG",
                field_key="country_of_origin",
                description="Country of manufacture / origin indication.",
                severity=SeverityLevel.MINOR,
                rule_type=RuleType.REQUIRED_PRESENCE,
                enabled=True,
            ),
            ChecklistRule(
                checklist_version_id=iso_v1.id,
                rule_key="ISO_EXPIRY_FORMAT",
                field_key="expiration_date",
                description="Dates must be expressed in ISO 8601 (YYYY-MM-DD or YYYY-MM).",
                severity=SeverityLevel.MAJOR,
                rule_type=RuleType.FORMAT_REGEX,
                expected_value=r"^\d{4}-\d{2}(-\d{2})?$",
                enabled=True,
            ),
            ChecklistRule(
                checklist_version_id=iso_v1.id,
                rule_key="ISO_CONTRAINDICATIONS",
                field_key="contraindications",
                description="Medical contraindications must be clearly documented in safety information.",
                severity=SeverityLevel.MAJOR,
                rule_type=RuleType.REQUIRED_PRESENCE,
                enabled=True,
            ),
        ]
        db.add_all(iso_rules)

        await db.commit()

    @classmethod
    async def get_checklists(cls, db: AsyncSession) -> List[ChecklistResponse]:
        """
        Returns all checklists with version count and latest version tag.
        """
        q = await db.execute(
            select(Checklist).order_by(Checklist.created_at.asc())
        )
        checklists = q.scalars().all()

        results: List[ChecklistResponse] = []
        for c in checklists:
            versions = c.versions or []
            v_count = len(versions)
            latest_v = versions[0].version if versions else None

            results.append(
                ChecklistResponse(
                    id=c.id,
                    name=c.name,
                    description=c.description,
                    jurisdiction=c.jurisdiction,
                    source_reference=c.source_reference,
                    is_demonstration=c.is_demonstration,
                    version_count=v_count,
                    latest_version=latest_v,
                    created_at=c.created_at,
                    updated_at=c.updated_at,
                )
            )
        return results

    @classmethod
    async def get_checklist(cls, db: AsyncSession, checklist_id: str) -> Optional[ChecklistDetailResponse]:
        """
        Returns checklist details with full version list and rule counts.
        """
        q = await db.execute(select(Checklist).where(Checklist.id == checklist_id))
        c = q.scalar_one_or_none()
        if not c:
            return None

        version_responses: List[ChecklistVersionResponse] = []
        for v in c.versions:
            is_locked, _ = await cls.is_version_locked(db, v.id)
            version_responses.append(
                ChecklistVersionResponse(
                    id=v.id,
                    checklist_id=v.checklist_id,
                    version=v.version,
                    status=v.status,
                    effective_date=v.effective_date,
                    changelog_summary=v.changelog_summary,
                    created_by=v.created_by,
                    rule_count=len(v.rules) if v.rules else 0,
                    is_locked=is_locked,
                    created_at=v.created_at,
                    updated_at=v.updated_at,
                )
            )

        return ChecklistDetailResponse(
            id=c.id,
            name=c.name,
            description=c.description,
            jurisdiction=c.jurisdiction,
            source_reference=c.source_reference,
            is_demonstration=c.is_demonstration,
            version_count=len(version_responses),
            latest_version=version_responses[0].version if version_responses else None,
            versions=version_responses,
            created_at=c.created_at,
            updated_at=c.updated_at,
        )

    @classmethod
    async def get_version(cls, db: AsyncSession, version_id: str) -> Optional[ChecklistVersionDetailResponse]:
        """
        Returns version details including its child rules and locked status.
        """
        q = await db.execute(select(ChecklistVersion).where(ChecklistVersion.id == version_id))
        v = q.scalar_one_or_none()
        if not v:
            return None

        is_locked, _ = await cls.is_version_locked(db, v.id)

        rule_responses = [
            ChecklistRuleResponse(
                id=r.id,
                checklist_version_id=r.checklist_version_id,
                rule_key=r.rule_key,
                field_key=r.field_key,
                description=r.description,
                severity=r.severity,
                rule_type=r.rule_type,
                expected_value=r.expected_value,
                config=r.config,
                enabled=r.enabled,
                created_at=r.created_at,
                updated_at=r.updated_at,
            )
            for r in (v.rules or [])
        ]

        return ChecklistVersionDetailResponse(
            id=v.id,
            checklist_id=v.checklist_id,
            version=v.version,
            status=v.status,
            effective_date=v.effective_date,
            changelog_summary=v.changelog_summary,
            created_by=v.created_by,
            rule_count=len(rule_responses),
            is_locked=is_locked,
            rules=rule_responses,
            created_at=v.created_at,
            updated_at=v.updated_at,
        )

    @classmethod
    async def create_checklist(cls, db: AsyncSession, data: ChecklistCreate) -> ChecklistDetailResponse:
        """
        Creates a new checklist with initial version and optional rules.
        """
        checklist = Checklist(
            name=data.name.strip(),
            description=data.description.strip() if data.description else None,
            jurisdiction=data.jurisdiction.strip(),
            source_reference=data.source_reference.strip() if data.source_reference else None,
            is_demonstration=data.is_demonstration,
        )
        db.add(checklist)
        await db.flush()

        # Create initial draft version
        version = ChecklistVersion(
            checklist_id=checklist.id,
            version=data.initial_version or "v1.0.0",
            status=VersionStatus.DRAFT,
            created_by="Checklist Creator",
        )
        db.add(version)
        await db.flush()

        if data.rules:
            for r in data.rules:
                db_rule = ChecklistRule(
                    checklist_version_id=version.id,
                    rule_key=r.rule_key,
                    field_key=r.field_key,
                    description=r.description,
                    severity=r.severity,
                    rule_type=r.rule_type,
                    expected_value=r.expected_value,
                    config=r.config,
                    enabled=r.enabled,
                )
                db.add(db_rule)

        await db.commit()
        await db.refresh(checklist)

        res = await cls.get_checklist(db, checklist.id)
        if not res:
            raise HTTPException(status_code=500, detail="Failed to retrieve created checklist")
        return res

    @classmethod
    async def create_version(
        cls,
        db: AsyncSession,
        checklist_id: str,
        data: ChecklistVersionCreate,
    ) -> ChecklistVersionDetailResponse:
        """
        Creates a new draft version for a checklist, optionally cloning rules from an existing version.
        """
        q = await db.execute(select(Checklist).where(Checklist.id == checklist_id))
        checklist = q.scalar_one_or_none()
        if not checklist:
            raise HTTPException(status_code=404, detail="Checklist not found")

        version = ChecklistVersion(
            checklist_id=checklist.id,
            version=data.version.strip(),
            status=VersionStatus.DRAFT,
            effective_date=data.effective_date,
            changelog_summary=data.changelog_summary,
            created_by=data.created_by or "Reviewer",
        )
        db.add(version)
        await db.flush()

        # If cloning from an existing version, copy all rules
        if data.clone_from_version_id:
            src_q = await db.execute(
                select(ChecklistVersion).where(ChecklistVersion.id == data.clone_from_version_id)
            )
            src_v = src_q.scalar_one_or_none()
            if not src_v:
                raise HTTPException(status_code=404, detail="Source version to clone from not found")

            for r in (src_v.rules or []):
                cloned_rule = ChecklistRule(
                    checklist_version_id=version.id,
                    rule_key=r.rule_key,
                    field_key=r.field_key,
                    description=r.description,
                    severity=r.severity,
                    rule_type=r.rule_type,
                    expected_value=r.expected_value,
                    config=r.config,
                    enabled=r.enabled,
                )
                db.add(cloned_rule)
        elif data.rules:
            for r in data.rules:
                db_rule = ChecklistRule(
                    checklist_version_id=version.id,
                    rule_key=r.rule_key,
                    field_key=r.field_key,
                    description=r.description,
                    severity=r.severity,
                    rule_type=r.rule_type,
                    expected_value=r.expected_value,
                    config=r.config,
                    enabled=r.enabled,
                )
                db.add(db_rule)

        await db.commit()
        await db.refresh(version)

        res = await cls.get_version(db, version.id)
        if not res:
            raise HTTPException(status_code=500, detail="Failed to retrieve created version")
        return res

    @classmethod
    async def publish_version(cls, db: AsyncSession, version_id: str) -> ChecklistVersionResponse:
        """
        Marks a version as published, locking it from further in-place edits.
        """
        q = await db.execute(select(ChecklistVersion).where(ChecklistVersion.id == version_id))
        version = q.scalar_one_or_none()
        if not version:
            raise HTTPException(status_code=404, detail="Checklist version not found")

        version.status = VersionStatus.PUBLISHED
        await db.commit()
        await db.refresh(version)

        return ChecklistVersionResponse(
            id=version.id,
            checklist_id=version.checklist_id,
            version=version.version,
            status=version.status,
            effective_date=version.effective_date,
            changelog_summary=version.changelog_summary,
            created_by=version.created_by,
            rule_count=len(version.rules) if version.rules else 0,
            is_locked=True,
            created_at=version.created_at,
            updated_at=version.updated_at,
        )

    @classmethod
    async def add_rule(cls, db: AsyncSession, version_id: str, data: ChecklistRuleCreate) -> ChecklistRuleResponse:
        """
        Adds a new rule to a draft version. Fails if version is locked.
        """
        is_locked, reason = await cls.is_version_locked(db, version_id)
        if is_locked:
            raise HTTPException(status_code=400, detail=reason)

        rule = ChecklistRule(
            checklist_version_id=version_id,
            rule_key=data.rule_key.strip(),
            field_key=data.field_key.strip(),
            description=data.description.strip(),
            severity=data.severity,
            rule_type=data.rule_type,
            expected_value=data.expected_value,
            config=data.config,
            enabled=data.enabled,
        )
        db.add(rule)
        await db.commit()
        await db.refresh(rule)

        return ChecklistRuleResponse(
            id=rule.id,
            checklist_version_id=rule.checklist_version_id,
            rule_key=rule.rule_key,
            field_key=rule.field_key,
            description=rule.description,
            severity=rule.severity,
            rule_type=rule.rule_type,
            expected_value=rule.expected_value,
            config=rule.config,
            enabled=rule.enabled,
            created_at=rule.created_at,
            updated_at=rule.updated_at,
        )

    @classmethod
    async def update_rule(cls, db: AsyncSession, rule_id: str, data: ChecklistRuleUpdate) -> ChecklistRuleResponse:
        """
        Updates an existing rule. Fails if parent version is locked.
        """
        q = await db.execute(select(ChecklistRule).where(ChecklistRule.id == rule_id))
        rule = q.scalar_one_or_none()
        if not rule:
            raise HTTPException(status_code=404, detail="Checklist rule not found")

        is_locked, reason = await cls.is_version_locked(db, rule.checklist_version_id)
        if is_locked:
            raise HTTPException(status_code=400, detail=reason)

        if data.description is not None:
            rule.description = data.description.strip()
        if data.severity is not None:
            rule.severity = data.severity
        if data.rule_type is not None:
            rule.rule_type = data.rule_type
        if data.expected_value is not None:
            rule.expected_value = data.expected_value
        if data.config is not None:
            rule.config = data.config
        if data.enabled is not None:
            rule.enabled = data.enabled

        await db.commit()
        await db.refresh(rule)

        return ChecklistRuleResponse(
            id=rule.id,
            checklist_version_id=rule.checklist_version_id,
            rule_key=rule.rule_key,
            field_key=rule.field_key,
            description=rule.description,
            severity=rule.severity,
            rule_type=rule.rule_type,
            expected_value=rule.expected_value,
            config=rule.config,
            enabled=rule.enabled,
            created_at=rule.created_at,
            updated_at=rule.updated_at,
        )

    @classmethod
    async def delete_rule(cls, db: AsyncSession, rule_id: str) -> bool:
        """
        Deletes a rule from a draft version. Fails if parent version is locked.
        """
        q = await db.execute(select(ChecklistRule).where(ChecklistRule.id == rule_id))
        rule = q.scalar_one_or_none()
        if not rule:
            raise HTTPException(status_code=404, detail="Checklist rule not found")

        is_locked, reason = await cls.is_version_locked(db, rule.checklist_version_id)
        if is_locked:
            raise HTTPException(status_code=400, detail=reason)

        await db.delete(rule)
        await db.commit()
        return True
