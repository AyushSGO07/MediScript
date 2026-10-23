from datetime import date
from app.services.date_validator import DateValidatorService

def test_iso_full_date():
    ref = date(2026, 10, 23)
    res = DateValidatorService.parse_and_validate("2028-12-31", reference_date=ref)
    assert res["is_valid"] is True
    assert res["normalized_value"] == "2028-12-31"
    assert res["is_iso_compliant"] is True
    assert res["is_expired"] is False
    assert res["days_until_expiration"] > 0

def test_expired_date():
    ref = date(2026, 10, 23)
    res = DateValidatorService.parse_and_validate("2022-05-15", reference_date=ref)
    assert res["is_valid"] is True
    assert res["normalized_value"] == "2022-05-15"
    assert res["is_expired"] is True
    assert res["days_until_expiration"] < 0

def test_gs1_ai_17_date():
    ref = date(2026, 10, 23)
    # GS1 (17)281231 -> 2028-12-31
    res = DateValidatorService.parse_and_validate("(17)281231", reference_date=ref)
    assert res["is_valid"] is True
    assert res["normalized_value"] == "2028-12-31"
    assert res["is_expired"] is False

    # GS1 (17)280200 -> leap year Feb 2028 -> 2028-02-29
    res_leap = DateValidatorService.parse_and_validate("(17)280200", reference_date=ref)
    assert res_leap["is_valid"] is True
    assert res_leap["normalized_value"] == "2028-02-29"

def test_slash_variants():
    ref = date(2026, 10, 23)
    res = DateValidatorService.parse_and_validate("12/31/2028", reference_date=ref)
    assert res["is_valid"] is True
    assert res["normalized_value"] == "2028-12-31"
    assert res["is_iso_compliant"] is False  # Slash is not ISO compliant
