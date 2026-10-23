import pytest
from app.services.rule_engine import RuleEngineService
from app.models.checklist import ChecklistRule, ChecklistVersion, SeverityLevel, RuleType
from app.models.extracted_field import ExtractedField
from app.models.finding import FindingCategory, FindingStatus


class DummyField:
    def __init__(
        self,
        field_key: str,
        confidence_state: str = "EXTRACTED",
        raw_value: str = "",
        normalized_value: str = "",
        is_iso_compliant: bool = True,
        is_expired: bool = False,
        document_id: str = "doc_1",
        evidence_page: int = 1,
        evidence_text: str = "sample text",
        norm_x0: float = 0.1,
        norm_y0: float = 0.2,
        norm_x1: float = 0.3,
        norm_y1: float = 0.4,
    ):
        self.field_key = field_key
        self.confidence_state = confidence_state
        self.raw_value = raw_value
        self.normalized_value = normalized_value
        self.is_iso_compliant = is_iso_compliant
        self.is_expired = is_expired
        self.document_id = document_id
        self.evidence_page = evidence_page
        self.evidence_text = evidence_text
        self.norm_x0 = norm_x0
        self.norm_y0 = norm_y0
        self.norm_x1 = norm_x1
        self.norm_y1 = norm_y1


class DummyRule:
    def __init__(
        self,
        rule_key: str,
        field_key: str,
        severity: str,
        rule_type: str,
        description: str,
        expected_value: str = None,
        enabled: bool = True,
        id: str = "r_1",
    ):
        self.id = id
        self.rule_key = rule_key
        self.field_key = field_key
        self.severity = severity
        self.rule_type = rule_type
        self.description = description
        self.expected_value = expected_value
        self.enabled = enabled


def test_required_presence_evaluation():
    rule = DummyRule(
        rule_key="UDI_DI_REQ",
        field_key="udi_di",
        severity=SeverityLevel.CRITICAL,
        rule_type=RuleType.REQUIRED_PRESENCE,
        description="UDI DI must be present",
    )

    # 1. NOT_FOUND
    f1 = RuleEngineService.evaluate_rule(rule, field_map={}, review_id="rev_1", checklist_version_id="v1")
    assert f1 is not None
    assert f1.severity == SeverityLevel.CRITICAL
    assert f1.observed_value == "NOT_FOUND"

    # 2. NOT_READABLE
    f2 = RuleEngineService.evaluate_rule(
        rule,
        field_map={"udi_di": DummyField("udi_di", confidence_state="NOT_READABLE", raw_value="???")},
        review_id="rev_1",
        checklist_version_id="v1",
    )
    assert f2 is not None
    assert f2.observed_value == "NOT_READABLE"
    assert f2.norm_x0 == 0.1

    # 3. AMBIGUOUS
    f3 = RuleEngineService.evaluate_rule(
        rule,
        field_map={"udi_di": DummyField("udi_di", confidence_state="AMBIGUOUS", raw_value="010123 / 019999")},
        review_id="rev_1",
        checklist_version_id="v1",
    )
    assert f3 is not None
    assert "AMBIGUOUS" in f3.observed_value

    # 4. EXTRACTED & Valid
    f4 = RuleEngineService.evaluate_rule(
        rule,
        field_map={"udi_di": DummyField("udi_di", confidence_state="EXTRACTED", normalized_value="01008500000001")},
        review_id="rev_1",
        checklist_version_id="v1",
    )
    assert f4 is None


def test_format_regex_evaluation():
    rule = DummyRule(
        rule_key="EXP_ISO_REGEX",
        field_key="expiration_date",
        severity=SeverityLevel.MAJOR,
        rule_type=RuleType.FORMAT_REGEX,
        description="Must be ISO YYYY-MM-DD",
        expected_value=r"^\d{4}-\d{2}-\d{2}$",
    )

    # Compliant
    f_pass = RuleEngineService.evaluate_rule(
        rule,
        field_map={"expiration_date": DummyField("expiration_date", normalized_value="2027-12-31")},
        review_id="rev_1",
    )
    assert f_pass is None

    # Non-compliant
    f_fail = RuleEngineService.evaluate_rule(
        rule,
        field_map={"expiration_date": DummyField("expiration_date", normalized_value="12/31/2027", raw_value="12/31/2027")},
        review_id="rev_1",
    )
    assert f_fail is not None
    assert f_fail.observed_value == "12/31/2027"
    assert f_fail.expected_value == r"Pattern: ^\d{4}-\d{2}-\d{2}$"


def test_date_expiration_evaluation():
    rule = DummyRule(
        rule_key="DATE_CHECK",
        field_key="expiration_date",
        severity=SeverityLevel.CRITICAL,
        rule_type=RuleType.DATE_EXPIRATION,
        description="Must be unexpired ISO date",
    )

    # 1. Expired date -> Critical finding
    f_exp = RuleEngineService.evaluate_rule(
        rule,
        field_map={"expiration_date": DummyField("expiration_date", normalized_value="2020-01-01", is_expired=True, is_iso_compliant=True)},
        review_id="rev_1",
    )
    assert f_exp is not None
    assert f_exp.severity == SeverityLevel.CRITICAL
    assert "EXPIRED" in f_exp.observed_value

    # 2. Non-ISO format date -> Major finding
    f_non_iso = RuleEngineService.evaluate_rule(
        rule,
        field_map={"expiration_date": DummyField("expiration_date", raw_value="2027/12", is_expired=False, is_iso_compliant=False)},
        review_id="rev_1",
    )
    assert f_non_iso is not None
    assert f_non_iso.severity == SeverityLevel.MAJOR
    assert "not compliant with ISO 8601" in f_non_iso.explanation

    # 3. Valid future ISO date -> Compliant
    f_valid = RuleEngineService.evaluate_rule(
        rule,
        field_map={"expiration_date": DummyField("expiration_date", normalized_value="2030-05-15", is_expired=False, is_iso_compliant=True)},
        review_id="rev_1",
    )
    assert f_valid is None


def test_cross_field_match_evaluation():
    # CE mark without Notified Body ID
    rule = DummyRule(
        rule_key="MDR_NOTIFIED_BODY",
        field_key="ce_mark",
        severity=SeverityLevel.CRITICAL,
        rule_type=RuleType.CROSS_FIELD_MATCH,
        description="CE mark requires 4-digit Notified Body ID",
    )

    # CE present, NB missing -> Finding
    f_nb_missing = RuleEngineService.evaluate_rule(
        rule,
        field_map={"ce_mark": DummyField("ce_mark", normalized_value="CE")},
        review_id="rev_1",
    )
    assert f_nb_missing is not None
    assert "4-digit Notified Body ID is missing" in f_nb_missing.explanation

    # Both present -> Compliant
    f_nb_present = RuleEngineService.evaluate_rule(
        rule,
        field_map={
            "ce_mark": DummyField("ce_mark", normalized_value="CE"),
            "notified_body_id": DummyField("notified_body_id", normalized_value="0123"),
        },
        review_id="rev_1",
    )
    assert f_nb_present is None


def test_rule_engine_deterministic_repeatability():
    rule1 = DummyRule("R1", "udi_di", SeverityLevel.CRITICAL, RuleType.REQUIRED_PRESENCE, "UDI DI required")
    rule2 = DummyRule("R2", "expiration_date", SeverityLevel.CRITICAL, RuleType.DATE_EXPIRATION, "Expiry check")
    rule3 = DummyRule("R3", "model_ref", SeverityLevel.MAJOR, RuleType.FORMAT_REGEX, "Model ref regex", expected_value=r"^REF-\d+$")

    class DummyVersion:
        id = "v_stable"
        rules = [rule1, rule2, rule3]

    revised_fields = [
        DummyField("expiration_date", normalized_value="2021-01-01", is_expired=True, is_iso_compliant=True),
        DummyField("model_ref", normalized_value="INVALID_REF"),
    ]

    # Run evaluation 5 times
    results = [
        RuleEngineService.evaluate_checklist("rev_det", DummyVersion(), revised_fields)
        for _ in range(5)
    ]

    # Verify all 5 runs produced identical results
    first_run = results[0]
    assert len(first_run) == 3  # UDI missing, Expiry expired, REF bad format

    for other_run in results[1:]:
        assert len(other_run) == len(first_run)
        for f1, f2 in zip(first_run, other_run):
            assert f1.rule_key == f2.rule_key
            assert f1.severity == f2.severity
            assert f1.explanation == f2.explanation
            assert f1.observed_value == f2.observed_value
            assert f1.norm_x0 == f2.norm_x0
