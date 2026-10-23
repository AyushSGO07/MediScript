import re
from typing import List, Optional, Dict, Any
from app.models.checklist import SeverityLevel, RuleType
from app.models.finding import FindingStatus, FindingCategory
from app.schemas.finding import FindingCreate
from app.models.extracted_field import ExtractedField


class RuleEngineService:

    @classmethod
    def map_field_category(cls, field_key: str) -> str:
        """
        Maps a canonical field_key to a structured FindingCategory.
        """
        k = (field_key or "").lower().strip()
        if k in ("udi_di", "udi_pi", "udi_full", "model_ref", "lot_batch", "serial_number"):
            return FindingCategory.IDENTIFIERS
        elif k in ("manufacturer_name", "manufacturer_address", "country_of_origin"):
            return FindingCategory.MANUFACTURER
        elif k in ("expiration_date", "manufacturing_date"):
            return FindingCategory.DATES
        elif k in ("ce_mark", "notified_body_id", "rx_only", "single_use", "sterile"):
            return FindingCategory.REGULATORY
        elif k in ("warnings", "contraindications", "storage_conditions"):
            return FindingCategory.SAFETY
        return FindingCategory.GENERAL

    @classmethod
    def evaluate_rule(
        cls,
        rule: Any,
        field_map: Dict[str, Any],
        other_fields: Optional[Dict[str, Any]] = None,
        review_id: str = "",
        checklist_version_id: str = "",
        doc_role: str = "revised",
        doc_id: Optional[str] = None,
    ) -> Optional[FindingCreate]:
        """
        Evaluates a single ChecklistRule against extracted fields for a document role.
        Returns a FindingCreate if non-compliant or questionable, None if passed.
        """
        field_key = (rule.field_key or "").lower().strip()
        rule_type = rule.rule_type
        category = cls.map_field_category(field_key)
        field = field_map.get(field_key)
        rule_id = getattr(rule, "id", None)
        other_fields = other_fields or {}

        # -------------------------------------------------------------
        # 1. REQUIRED_PRESENCE
        # -------------------------------------------------------------
        if rule_type == RuleType.REQUIRED_PRESENCE:
            if not field or getattr(field, "confidence_state", "") == "NOT_FOUND":
                return FindingCreate(
                    review_id=review_id,
                    rule_id=rule_id,
                    rule_key=rule.rule_key,
                    checklist_version_id=checklist_version_id,
                    category=category,
                    severity=rule.severity,
                    status=FindingStatus.OPEN,
                    explanation=f"Required field '{rule.field_key}' was not found on the {doc_role} label ({rule.description}).",
                    expected_value="Present and legible on device label",
                    observed_value="NOT_FOUND",
                    source_document_id=doc_id or getattr(field, "document_id", None),
                    document_role=doc_role,
                    page_number=1,
                    evidence_snippet="Field omitted from label",
                )

            conf = getattr(field, "confidence_state", "")
            if conf == "NOT_READABLE":
                return FindingCreate(
                    review_id=review_id,
                    rule_id=rule_id,
                    rule_key=rule.rule_key,
                    checklist_version_id=checklist_version_id,
                    category=category,
                    severity=rule.severity,
                    status=FindingStatus.OPEN,
                    explanation=f"Required field '{rule.field_key}' is not readable on the {doc_role} label (lacks digital text layer or contains unparseable glyphs).",
                    expected_value="Present and machine-readable text",
                    observed_value="NOT_READABLE",
                    source_document_id=getattr(field, "document_id", doc_id),
                    document_role=doc_role,
                    page_number=getattr(field, "evidence_page", 1),
                    evidence_snippet=getattr(field, "evidence_text", None),
                    norm_x0=getattr(field, "norm_x0", None),
                    norm_y0=getattr(field, "norm_y0", None),
                    norm_x1=getattr(field, "norm_x1", None),
                    norm_y1=getattr(field, "norm_y1", None),
                )

            if conf == "AMBIGUOUS":
                return FindingCreate(
                    review_id=review_id,
                    rule_id=rule_id,
                    rule_key=rule.rule_key,
                    checklist_version_id=checklist_version_id,
                    category=category,
                    severity=rule.severity,
                    status=FindingStatus.OPEN,
                    explanation=f"Required field '{rule.field_key}' is ambiguous with multiple conflicting candidates found on the label.",
                    expected_value="Unambiguous single identifier",
                    observed_value=f"AMBIGUOUS ({getattr(field, 'raw_value', 'conflicting values')})",
                    source_document_id=getattr(field, "document_id", doc_id),
                    document_role=doc_role,
                    page_number=getattr(field, "evidence_page", 1),
                    evidence_snippet=getattr(field, "evidence_text", None),
                    norm_x0=getattr(field, "norm_x0", None),
                    norm_y0=getattr(field, "norm_y0", None),
                    norm_x1=getattr(field, "norm_x1", None),
                    norm_y1=getattr(field, "norm_y1", None),
                )

            # If EXTRACTED, check if value is non-empty
            val = (getattr(field, "normalized_value", None) or getattr(field, "raw_value", None) or "").strip()
            if not val:
                return FindingCreate(
                    review_id=review_id,
                    rule_id=rule_id,
                    rule_key=rule.rule_key,
                    checklist_version_id=checklist_version_id,
                    category=category,
                    severity=rule.severity,
                    status=FindingStatus.OPEN,
                    explanation=f"Required field '{rule.field_key}' was detected but has an empty or blank value.",
                    expected_value="Non-empty text value",
                    observed_value="[EMPTY STRING]",
                    source_document_id=getattr(field, "document_id", doc_id),
                    document_role=doc_role,
                    page_number=getattr(field, "evidence_page", 1),
                    evidence_snippet=getattr(field, "evidence_text", None),
                    norm_x0=getattr(field, "norm_x0", None),
                    norm_y0=getattr(field, "norm_y0", None),
                    norm_x1=getattr(field, "norm_x1", None),
                    norm_y1=getattr(field, "norm_y1", None),
                )

            return None  # Compliant

        # -------------------------------------------------------------
        # 2. FORMAT_REGEX
        # -------------------------------------------------------------
        elif rule_type == RuleType.FORMAT_REGEX:
            expected_pattern = rule.expected_value or ""
            if not field or getattr(field, "confidence_state", "") != "EXTRACTED":
                return FindingCreate(
                    review_id=review_id,
                    rule_id=rule_id,
                    rule_key=rule.rule_key,
                    checklist_version_id=checklist_version_id,
                    category=category,
                    severity=rule.severity,
                    status=FindingStatus.OPEN,
                    explanation=f"Field '{rule.field_key}' required for format verification is missing on {doc_role} label.",
                    expected_value=f"Pattern: {expected_pattern}",
                    observed_value=getattr(field, "confidence_state", "NOT_FOUND"),
                    source_document_id=doc_id or getattr(field, "document_id", None),
                    document_role=doc_role,
                    page_number=getattr(field, "evidence_page", 1) if field else 1,
                    evidence_snippet="Field omitted from label",
                )

            val = (getattr(field, "normalized_value", None) or getattr(field, "raw_value", None) or "").strip()
            try:
                if not re.search(expected_pattern, val):
                    return FindingCreate(
                        review_id=review_id,
                        rule_id=rule_id,
                        rule_key=rule.rule_key,
                        checklist_version_id=checklist_version_id,
                        category=category,
                        severity=rule.severity,
                        status=FindingStatus.OPEN,
                        explanation=f"Field '{rule.field_key}' value does not conform to required regex format ({rule.description}).",
                        expected_value=f"Pattern: {expected_pattern}",
                        observed_value=val,
                        source_document_id=getattr(field, "document_id", doc_id),
                        document_role=doc_role,
                        page_number=getattr(field, "evidence_page", 1),
                        evidence_snippet=getattr(field, "evidence_text", None),
                        norm_x0=getattr(field, "norm_x0", None),
                        norm_y0=getattr(field, "norm_y0", None),
                        norm_x1=getattr(field, "norm_x1", None),
                        norm_y1=getattr(field, "norm_y1", None),
                    )
            except re.error:
                # If regex fails to compile, ignore or flag
                pass

            return None  # Compliant

        # -------------------------------------------------------------
        # 3. VALUE_MATCH
        # -------------------------------------------------------------
        elif rule_type == RuleType.VALUE_MATCH:
            expected_val = (rule.expected_value or "").strip()
            if not field or getattr(field, "confidence_state", "") != "EXTRACTED":
                return FindingCreate(
                    review_id=review_id,
                    rule_id=rule_id,
                    rule_key=rule.rule_key,
                    checklist_version_id=checklist_version_id,
                    category=category,
                    severity=rule.severity,
                    status=FindingStatus.OPEN,
                    explanation=f"Field '{rule.field_key}' required for value match is missing on {doc_role} label.",
                    expected_value=expected_val,
                    observed_value=getattr(field, "confidence_state", "NOT_FOUND"),
                    source_document_id=doc_id or getattr(field, "document_id", None),
                    document_role=doc_role,
                    page_number=1,
                    evidence_snippet="Field omitted from label",
                )

            val = (getattr(field, "normalized_value", None) or getattr(field, "raw_value", None) or "").strip()
            if expected_val.lower() not in val.lower():
                return FindingCreate(
                    review_id=review_id,
                    rule_id=rule_id,
                    rule_key=rule.rule_key,
                    checklist_version_id=checklist_version_id,
                    category=category,
                    severity=rule.severity,
                    status=FindingStatus.OPEN,
                    explanation=f"Field '{rule.field_key}' does not contain expected value '{expected_val}'.",
                    expected_value=expected_val,
                    observed_value=val,
                    source_document_id=getattr(field, "document_id", doc_id),
                    document_role=doc_role,
                    page_number=getattr(field, "evidence_page", 1),
                    evidence_snippet=getattr(field, "evidence_text", None),
                    norm_x0=getattr(field, "norm_x0", None),
                    norm_y0=getattr(field, "norm_y0", None),
                    norm_x1=getattr(field, "norm_x1", None),
                    norm_y1=getattr(field, "norm_y1", None),
                )

            return None  # Compliant

        # -------------------------------------------------------------
        # 4. DATE_EXPIRATION
        # -------------------------------------------------------------
        elif rule_type == RuleType.DATE_EXPIRATION:
            if not field or getattr(field, "confidence_state", "") != "EXTRACTED":
                return FindingCreate(
                    review_id=review_id,
                    rule_id=rule_id,
                    rule_key=rule.rule_key,
                    checklist_version_id=checklist_version_id,
                    category=category,
                    severity=rule.severity,
                    status=FindingStatus.OPEN,
                    explanation=f"Expiration date is missing from the {doc_role} label ({rule.description}).",
                    expected_value="Valid unexpired ISO 8601 date",
                    observed_value=getattr(field, "confidence_state", "NOT_FOUND"),
                    source_document_id=doc_id or getattr(field, "document_id", None),
                    document_role=doc_role,
                    page_number=1,
                    evidence_snippet="Expiration date omitted",
                )

            # Check expired status (Critical)
            if getattr(field, "is_expired", False):
                raw = getattr(field, "raw_value", "")
                norm = getattr(field, "normalized_value", "")
                return FindingCreate(
                    review_id=review_id,
                    rule_id=rule_id,
                    rule_key=rule.rule_key,
                    checklist_version_id=checklist_version_id,
                    category=category,
                    severity=SeverityLevel.CRITICAL,
                    status=FindingStatus.OPEN,
                    explanation=f"Device expiration date '{norm or raw}' indicates that the product shelf life has expired.",
                    expected_value="Unexpired date in the future",
                    observed_value=f"EXPIRED ({norm or raw})",
                    source_document_id=getattr(field, "document_id", doc_id),
                    document_role=doc_role,
                    page_number=getattr(field, "evidence_page", 1),
                    evidence_snippet=getattr(field, "evidence_text", None),
                    norm_x0=getattr(field, "norm_x0", None),
                    norm_y0=getattr(field, "norm_y0", None),
                    norm_x1=getattr(field, "norm_x1", None),
                    norm_y1=getattr(field, "norm_y1", None),
                )

            # Check ISO format compliance (Major)
            if not getattr(field, "is_iso_compliant", True):
                raw = getattr(field, "raw_value", "")
                return FindingCreate(
                    review_id=review_id,
                    rule_id=rule_id,
                    rule_key=rule.rule_key,
                    checklist_version_id=checklist_version_id,
                    category=category,
                    severity=SeverityLevel.MAJOR,
                    status=FindingStatus.OPEN,
                    explanation=f"Expiration date '{raw}' is not compliant with ISO 8601 format standards (YYYY-MM-DD or YYYY-MM).",
                    expected_value="ISO 8601 standard (YYYY-MM-DD or YYYY-MM)",
                    observed_value=raw,
                    source_document_id=getattr(field, "document_id", doc_id),
                    document_role=doc_role,
                    page_number=getattr(field, "evidence_page", 1),
                    evidence_snippet=getattr(field, "evidence_text", None),
                    norm_x0=getattr(field, "norm_x0", None),
                    norm_y0=getattr(field, "norm_y0", None),
                    norm_x1=getattr(field, "norm_x1", None),
                    norm_y1=getattr(field, "norm_y1", None),
                )

            return None  # Compliant

        # -------------------------------------------------------------
        # 5. CROSS_FIELD_MATCH
        # -------------------------------------------------------------
        elif rule_type == RuleType.CROSS_FIELD_MATCH:
            # Special Case: CE mark presence requires Notified Body ID
            if field_key == "ce_mark" or "NOTIFIED_BODY" in rule.rule_key:
                ce_field = field_map.get("ce_mark")
                nb_field = field_map.get("notified_body_id")
                if ce_field and getattr(ce_field, "confidence_state", "") == "EXTRACTED":
                    if not nb_field or getattr(nb_field, "confidence_state", "") != "EXTRACTED":
                        return FindingCreate(
                            review_id=review_id,
                            rule_id=rule_id,
                            rule_key=rule.rule_key,
                            checklist_version_id=checklist_version_id,
                            category=category,
                            severity=rule.severity,
                            status=FindingStatus.OPEN,
                            explanation="CE Mark is present on device label, but required 4-digit Notified Body ID is missing.",
                            expected_value="4-digit Notified Body identification number (e.g. 0123)",
                            observed_value="NOT_FOUND",
                            source_document_id=getattr(ce_field, "document_id", doc_id),
                            document_role=doc_role,
                            page_number=getattr(ce_field, "evidence_page", 1),
                            evidence_snippet=getattr(ce_field, "evidence_text", None),
                            norm_x0=getattr(ce_field, "norm_x0", None),
                            norm_y0=getattr(ce_field, "norm_y0", None),
                            norm_x1=getattr(ce_field, "norm_x1", None),
                            norm_y1=getattr(ce_field, "norm_y1", None),
                        )

            # Special Case: Baseline vs Revised unauthorized deletion
            base_field = other_fields.get(field_key)
            if base_field and getattr(base_field, "confidence_state", "") == "EXTRACTED":
                if not field or getattr(field, "confidence_state", "") != "EXTRACTED":
                    base_val = getattr(base_field, "normalized_value", "") or getattr(base_field, "raw_value", "")
                    return FindingCreate(
                        review_id=review_id,
                        rule_id=rule_id,
                        rule_key=rule.rule_key,
                        checklist_version_id=checklist_version_id,
                        category=category,
                        severity=rule.severity,
                        status=FindingStatus.OPEN,
                        explanation=f"Approved field '{rule.field_key}' present in baseline ({base_val}) was omitted or deleted in the revised label.",
                        expected_value=f"Retained baseline value: {base_val}",
                        observed_value="OMITTED_IN_REVISED",
                        source_document_id=getattr(base_field, "document_id", doc_id),
                        document_role="revised",
                        page_number=getattr(base_field, "evidence_page", 1),
                        evidence_snippet=getattr(base_field, "evidence_text", None),
                        norm_x0=getattr(base_field, "norm_x0", None),
                        norm_y0=getattr(base_field, "norm_y0", None),
                        norm_x1=getattr(base_field, "norm_x1", None),
                        norm_y1=getattr(base_field, "norm_y1", None),
                    )

            return None  # Compliant

        return None

    @classmethod
    def evaluate_checklist(
        cls,
        review_id: str,
        checklist_version: Any,
        revised_fields: List[Any],
        baseline_fields: Optional[List[Any]] = None,
        revised_doc_id: Optional[str] = None,
        baseline_doc_id: Optional[str] = None,
    ) -> List[FindingCreate]:
        """
        Executes deterministic rule evaluation across all active rules in the checklist version.
        Evaluates revised fields as the primary compliance target and cross-checks against baseline fields.
        """
        revised_map: Dict[str, Any] = {
            (getattr(f, "field_key", "") or "").lower().strip(): f
            for f in revised_fields
        }
        baseline_map: Dict[str, Any] = {
            (getattr(f, "field_key", "") or "").lower().strip(): f
            for f in (baseline_fields or [])
        }

        rules = [r for r in (getattr(checklist_version, "rules", []) or []) if getattr(r, "enabled", True)]
        findings: List[FindingCreate] = []

        v_id = getattr(checklist_version, "id", "")

        for rule in rules:
            f = cls.evaluate_rule(
                rule=rule,
                field_map=revised_map,
                other_fields=baseline_map,
                review_id=review_id,
                checklist_version_id=v_id,
                doc_role="revised",
                doc_id=revised_doc_id,
            )
            if f:
                findings.append(f)

        # Sort findings deterministically: Critical first, then Major, then Minor, then by rule_key
        severity_rank = {
            SeverityLevel.CRITICAL: 1,
            SeverityLevel.MAJOR: 2,
            SeverityLevel.MINOR: 3,
        }
        findings.sort(key=lambda x: (severity_rank.get(x.severity, 4), x.rule_key))

        return findings
