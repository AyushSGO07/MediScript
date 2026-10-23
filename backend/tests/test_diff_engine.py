import pytest
from app.services.diff_engine import DiffEngineService, DiffType, DiffCategory


def test_whitespace_normalization():
    raw_1 = "Sterile   EO\n\nStore between 2-8°C\r\nDo not   freeze."
    raw_2 = "Sterile EO Store between 2-8°C Do not freeze."
    norm_1 = DiffEngineService.normalize_text(raw_1)
    norm_2 = DiffEngineService.normalize_text(raw_2)
    assert norm_1 == norm_2

    # Unicode dash and quotes normalization
    fancy = "“Rx Only” – Single‐Use"
    norm_fancy = DiffEngineService.normalize_text(fancy)
    assert norm_fancy == '"Rx Only" - Single-Use'


def test_identical_blocks_produce_no_diffs():
    blocks = [
        {"id": "b1", "page_number": 1, "text": "CardioFix Stent System", "norm_x0": 0.1, "norm_y0": 0.1, "norm_x1": 0.5, "norm_y1": 0.15},
        {"id": "b2", "page_number": 1, "text": "REF 98765 LOT 45210", "norm_x0": 0.1, "norm_y0": 0.2, "norm_x1": 0.5, "norm_y1": 0.25},
    ]

    diffs = DiffEngineService.diff_documents(blocks, blocks, include_unchanged=False)
    assert len(diffs) == 0

    diffs_with_unchanged = DiffEngineService.diff_documents(blocks, blocks, include_unchanged=True)
    assert len(diffs_with_unchanged) == 2
    assert all(d["change_type"] == DiffType.UNCHANGED for d in diffs_with_unchanged)


def test_modified_block_with_word_token_diff():
    baseline = [
        {"id": "b1", "page_number": 1, "text": "Store between 2-8 C in a dry place", "norm_x0": 0.1, "norm_y0": 0.3, "norm_x1": 0.6, "norm_y1": 0.35}
    ]
    revised = [
        {"id": "r1", "page_number": 1, "text": "Store between 15-25 C in a dry place", "norm_x0": 0.1, "norm_y0": 0.3, "norm_x1": 0.6, "norm_y1": 0.35}
    ]

    diffs = DiffEngineService.diff_documents(baseline, revised)
    assert len(diffs) == 1
    d = diffs[0]
    assert d["change_type"] == DiffType.MODIFIED
    assert d["category"] == DiffCategory.SAFETY
    assert d["significance"] == "High"
    assert d["baseline_page"] == 1
    assert d["revised_page"] == 1
    assert d["baseline_norm_x0"] == 0.1
    assert d["revised_norm_x0"] == 0.1

    # Check token diff
    types = [t["type"] for t in d["token_diffs"]]
    assert "delete" in types
    assert "insert" in types
    assert "equal" in types

    deleted_token = next(t for t in d["token_diffs"] if t["type"] == "delete")
    inserted_token = next(t for t in d["token_diffs"] if t["type"] == "insert")
    assert deleted_token["text"] == "2-8"
    assert inserted_token["text"] == "15-25"


def test_added_and_deleted_blocks():
    baseline = [
        {"id": "b1", "page_number": 1, "text": "MedTech GmbH", "norm_x0": 0.1, "norm_y0": 0.1, "norm_x1": 0.4, "norm_y1": 0.15},
        {"id": "b2", "page_number": 1, "text": "Deprecated Notice: Single patient use only", "norm_x0": 0.1, "norm_y0": 0.2, "norm_x1": 0.5, "norm_y1": 0.25},
    ]
    revised = [
        {"id": "r1", "page_number": 1, "text": "MedTech GmbH", "norm_x0": 0.1, "norm_y0": 0.1, "norm_x1": 0.4, "norm_y1": 0.15},
        {"id": "r2", "page_number": 1, "text": "UDI (01)00850012345678(17)261231", "norm_x0": 0.1, "norm_y0": 0.3, "norm_x1": 0.8, "norm_y1": 0.35},
    ]

    diffs = DiffEngineService.diff_documents(baseline, revised)
    # Block 1 is unchanged. Block 2 in baseline replaced by UDI in revised.
    # Because baseline block and revised block have very low similarity, one is DELETED and one is ADDED.
    assert len(diffs) == 2
    types = {d["change_type"] for d in diffs}
    assert DiffType.DELETED in types
    assert DiffType.ADDED in types

    added_item = next(d for d in diffs if d["change_type"] == DiffType.ADDED)
    assert added_item["category"] == DiffCategory.IDENTIFIERS
    assert added_item["baseline_page"] is None
    assert added_item["revised_page"] == 1
    assert added_item["revised_norm_x0"] == 0.1

    deleted_item = next(d for d in diffs if d["change_type"] == DiffType.DELETED)
    assert deleted_item["category"] == DiffCategory.SAFETY
    assert deleted_item["baseline_page"] == 1
    assert deleted_item["revised_page"] is None


def test_category_heuristics():
    assert DiffEngineService.categorize_text_change("EXP: 2028-10-31") == DiffCategory.DATES
    assert DiffEngineService.categorize_text_change("UDI (01)9876543210") == DiffCategory.IDENTIFIERS
    assert DiffEngineService.categorize_text_change("CE 0123 Notified Body") == DiffCategory.REGULATORY
    assert DiffEngineService.categorize_text_change("Caution: Federal law restricts this device") == DiffCategory.SAFETY
    assert DiffEngineService.categorize_text_change("Manufactured by Acme Bio Inc.") == DiffCategory.MANUFACTURER
    assert DiffEngineService.categorize_text_change("Latex free sterile blister pouch") == DiffCategory.SAFETY
    assert DiffEngineService.categorize_text_change("Random marketing brochure text") == DiffCategory.GENERAL


def test_deterministic_reproducibility():
    base = [
        {"id": "b1", "page_number": 1, "text": "Caution: Do not reuse.", "norm_x0": 0.1, "norm_y0": 0.2, "norm_x1": 0.4, "norm_y1": 0.25},
        {"id": "b2", "page_number": 1, "text": "REF 111", "norm_x0": 0.1, "norm_y0": 0.3, "norm_x1": 0.4, "norm_y1": 0.35},
    ]
    rev = [
        {"id": "r1", "page_number": 1, "text": "Warning: Do not reuse or resterilize.", "norm_x0": 0.1, "norm_y0": 0.2, "norm_x1": 0.5, "norm_y1": 0.25},
        {"id": "r2", "page_number": 1, "text": "REF 222", "norm_x0": 0.1, "norm_y0": 0.3, "norm_x1": 0.4, "norm_y1": 0.35},
    ]

    res_1 = DiffEngineService.diff_documents(base, rev)
    res_2 = DiffEngineService.diff_documents(base, rev)

    assert len(res_1) == len(res_2)
    for d1, d2 in zip(res_1, res_2):
        assert d1["change_type"] == d2["change_type"]
        assert d1["category"] == d2["category"]
        assert d1["baseline_text"] == d2["baseline_text"]
        assert d1["revised_text"] == d2["revised_text"]
        assert d1["token_diffs"] == d2["token_diffs"]
