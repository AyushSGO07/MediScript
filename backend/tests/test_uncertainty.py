from app.services.uncertainty_resolver import UncertaintyResolver

FIELD_LOT = {
    "key": "lot_batch",
    "label": "LOT / Batch Number",
    "category": "identifiers",
}

FIELD_EXP = {
    "key": "expiration_date",
    "label": "Expiration Date",
    "category": "dates",
}

def test_resolve_extracted_unambiguous():
    candidates = [
        {
            "value": "LOT-2026-X99",
            "evidence_text": "LOT: LOT-2026-X99",
            "page_number": 1,
            "block_id": "b-1",
            "norm_x0": 0.1, "norm_y0": 0.2, "norm_x1": 0.3, "norm_y1": 0.25,
        }
    ]
    res = UncertaintyResolver.resolve_field(FIELD_LOT, candidates, has_text_layer=True)
    assert res["confidence_state"] == "EXTRACTED"
    assert res["value"] == "LOT-2026-X99"
    assert res["evidence_page"] == 1
    assert res["norm_x0"] == 0.1

def test_resolve_ambiguous_conflicts():
    candidates = [
        {
            "value": "LOT-2026-X99",
            "evidence_text": "LOT: LOT-2026-X99",
            "page_number": 1,
        },
        {
            "value": "LOT-2026-Z00",
            "evidence_text": "LOT: LOT-2026-Z00",
            "page_number": 2,
        }
    ]
    res = UncertaintyResolver.resolve_field(FIELD_LOT, candidates, has_text_layer=True)
    assert res["confidence_state"] == "AMBIGUOUS"
    assert "LOT-2026-Z00" in res["evidence_text"]

def test_resolve_not_found():
    res = UncertaintyResolver.resolve_field(FIELD_LOT, [], has_text_layer=True)
    assert res["confidence_state"] == "NOT_FOUND"
    assert res["value"] is None

def test_resolve_not_readable_scanned():
    res = UncertaintyResolver.resolve_field(FIELD_LOT, [], has_text_layer=False)
    assert res["confidence_state"] == "NOT_READABLE"
    assert "Scanned raster" in res["evidence_text"]

def test_resolve_date_normalization():
    candidates = [
        {
            "value": "2028-12-31",
            "evidence_text": "EXP: 2028-12-31",
            "page_number": 1,
        }
    ]
    res = UncertaintyResolver.resolve_field(FIELD_EXP, candidates, has_text_layer=True)
    assert res["confidence_state"] == "EXTRACTED"
    assert res["normalized_value"] == "2028-12-31"
    assert res["is_iso_compliant"] is True
    assert res["is_expired"] is False
