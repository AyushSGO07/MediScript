import json
from app.services.checklist_parser import ChecklistParserService
from app.models.checklist import ChecklistRule


def test_valid_csv_parsing():
    csv_text = """# Medical Device Labeling Rules
rule_key,field_key,description,severity,rule_type,expected_value,enabled
UDI_CHECK,udi_di,Device identifier must be present,critical,required_presence,,true
EXP_CHECK,expiration_date,ISO expiration date,major,format_regex,^\\d{4}-\\d{2}-\\d{2}$,1
LOT_CHECK,lot_batch,Lot batch number,minor,required_presence,,false
"""
    rules, errors = ChecklistParserService.parse_csv(csv_text)
    assert len(errors) == 0
    assert len(rules) == 3

    assert rules[0].rule_key == "UDI_CHECK"
    assert rules[0].field_key == "udi_di"
    assert rules[0].severity == "Critical"
    assert rules[0].rule_type == "REQUIRED_PRESENCE"
    assert rules[0].enabled is True

    assert rules[1].rule_key == "EXP_CHECK"
    assert rules[1].expected_value == r"^\d{4}-\d{2}-\d{2}$"
    assert rules[1].enabled is True

    assert rules[2].enabled is False


def test_invalid_csv_parsing_errors():
    # Missing required header 'severity'
    bad_header_csv = """rule_key,field_key,description,rule_type
R1,f1,desc,REQUIRED_PRESENCE
"""
    rules, errors = ChecklistParserService.parse_csv(bad_header_csv)
    assert len(rules) == 0
    assert any("Missing required CSV columns" in e for e in errors)

    # Invalid severity and missing expected_value for regex
    bad_rows_csv = """rule_key,field_key,description,severity,rule_type,expected_value,enabled
R1,f1,desc,InvalidSev,REQUIRED_PRESENCE,,true
R2,f2,desc,Major,FORMAT_REGEX,,true
"""
    rules, errors = ChecklistParserService.parse_csv(bad_rows_csv)
    assert len(rules) == 0
    assert len(errors) >= 2
    assert any("Invalid severity 'InvalidSev'" in e for e in errors)
    assert any("expected_value' is required for FORMAT_REGEX" in e for e in errors)


def test_redos_pattern_safety():
    # Dangerous nested quantifiers
    dangerous_patterns = [
        r"(a+)+$",
        r"([a-z]+)*$",
        r"(\d+)+",
    ]
    for pat in dangerous_patterns:
        is_safe, err = ChecklistParserService.check_redos_safety(pat)
        assert is_safe is False, f"Expected {pat} to be flagged as unsafe"
        assert "exponential backtracking" in err

    # Safe regex patterns
    safe_patterns = [
        r"^\d{4}-\d{2}-\d{2}$",
        r"^01\d{14}$",
        r"^[A-Z0-9]{5,20}$",
        r"^CE\s*\d{4}$",
    ]
    for pat in safe_patterns:
        is_safe, err = ChecklistParserService.check_redos_safety(pat)
        assert is_safe is True, f"Expected {pat} to be safe, got: {err}"
        assert err is None


def test_valid_json_parsing():
    json_text = json.dumps({
        "name": "EU MDR Labeling Checklist",
        "jurisdiction": "EU MDR (EU)",
        "source_reference": "MDR Annex I",
        "version": "v1.0.0",
        "description": "Standard MDR checks",
        "is_demonstration": True,
        "rules": [
            {
                "rule_key": "MDR_CE_REQ",
                "field_key": "ce_mark",
                "description": "CE mark required",
                "severity": "Critical",
                "rule_type": "REQUIRED_PRESENCE",
            },
            {
                "rule_key": "MDR_NB_ID",
                "field_key": "notified_body_id",
                "description": "4-digit notified body ID",
                "severity": "Critical",
                "rule_type": "FORMAT_REGEX",
                "expected_value": r"^\d{4}$",
            }
        ]
    })

    checklist_create, rules, errors = ChecklistParserService.parse_json(json_text)
    assert len(errors) == 0
    assert checklist_create is not None
    assert checklist_create.name == "EU MDR Labeling Checklist"
    assert checklist_create.jurisdiction == "EU MDR (EU)"
    assert len(rules) == 2
    assert rules[0].rule_key == "MDR_CE_REQ"
    assert rules[1].expected_value == r"^\d{4}$"


def test_templates_and_roundtrip_export():
    # Test CSV template generation
    csv_template = ChecklistParserService.generate_csv_template()
    assert "MediScript Regulatory Checklist CSV Template" in csv_template
    # Template should parse back cleanly
    rules, errors = ChecklistParserService.parse_csv(csv_template)
    assert len(errors) == 0
    assert len(rules) >= 4

    # Test JSON template generation
    json_template = ChecklistParserService.generate_json_template()
    checklist_create, rules, errors = ChecklistParserService.parse_json(json_template)
    assert len(errors) == 0
    assert checklist_create is not None
    assert len(rules) >= 3

    # Test Export Roundtrip
    exported_csv = ChecklistParserService.export_version_csv(rules)
    reparsed_rules, csv_errs = ChecklistParserService.parse_csv(exported_csv)
    assert len(csv_errs) == 0
    assert len(reparsed_rules) == len(rules)
