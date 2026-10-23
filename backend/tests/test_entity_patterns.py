import pytest
from app.services.entity_extraction import EntityExtractionService

def test_extract_udi_and_batch():
    blocks = [
        {
            "page_number": 1,
            "block_index": 0,
            "text": "UDI: (01)00850012345678(17)281231(10)LOT-2026-X99",
            "x0": 50.0, "y0": 50.0, "x1": 250.0, "y1": 70.0,
            "norm_x0": 0.08, "norm_y0": 0.06, "norm_x1": 0.41, "norm_y1": 0.09,
        }
    ]

    candidates = EntityExtractionService.extract_candidates_from_blocks(blocks)
    assert len(candidates["udi_di"]) == 1
    assert candidates["udi_di"][0]["value"] == "00850012345678"
    assert candidates["udi_di"][0]["page_number"] == 1
    assert candidates["udi_di"][0]["norm_x0"] == 0.08

    assert len(candidates["lot_batch"]) >= 1
    assert candidates["lot_batch"][0]["value"] == "LOT-2026-X99"

def test_extract_ref_and_serial():
    blocks = [
        {
            "page_number": 1,
            "block_index": 1,
            "text": "REF: MC-9002 | SN: SN-8839210",
            "x0": 50.0, "y0": 80.0, "x1": 200.0, "y1": 95.0,
            "norm_x0": 0.08, "norm_y0": 0.1, "norm_x1": 0.33, "norm_y1": 0.12,
        }
    ]

    candidates = EntityExtractionService.extract_candidates_from_blocks(blocks)
    assert len(candidates["model_ref"]) == 1
    assert candidates["model_ref"][0]["value"] == "MC-9002"

    assert len(candidates["serial_number"]) == 1
    assert candidates["serial_number"][0]["value"] == "SN-8839210"

def test_extract_ce_and_notified_body():
    blocks = [
        {
            "page_number": 1,
            "block_index": 2,
            "text": "CE 2797 STERILE EO",
            "x0": 50.0, "y0": 110.0, "x1": 150.0, "y1": 125.0,
            "norm_x0": 0.08, "norm_y0": 0.14, "norm_x1": 0.25, "norm_y1": 0.16,
        }
    ]

    candidates = EntityExtractionService.extract_candidates_from_blocks(blocks)
    assert len(candidates["ce_mark"]) == 1
    assert candidates["notified_body_id"][0]["value"] == "2797"
    assert len(candidates["sterile"]) == 1
    assert "STERILE" in candidates["sterile"][0]["value"]

def test_extract_manufacturer_and_safety():
    blocks = [
        {
            "page_number": 2,
            "block_index": 0,
            "text": "Manufactured by MediCardia Inc., 100 Bioscience Way, Boston, MA\nMade in USA",
            "x0": 72.0, "y0": 100.0, "x1": 350.0, "y1": 130.0,
            "norm_x0": 0.12, "norm_y0": 0.13, "norm_x1": 0.57, "norm_y1": 0.16,
        },
        {
            "page_number": 2,
            "block_index": 1,
            "text": "Caution: Federal law restricts this device to sale by or on the order of a physician.\nStorage: Store between 15°C and 25°C. Keep dry.",
            "x0": 72.0, "y0": 140.0, "x1": 400.0, "y1": 180.0,
            "norm_x0": 0.12, "norm_y0": 0.18, "norm_x1": 0.65, "norm_y1": 0.23,
        }
    ]

    candidates = EntityExtractionService.extract_candidates_from_blocks(blocks)
    assert len(candidates["manufacturer_name"]) >= 1
    assert "MediCardia Inc." in candidates["manufacturer_name"][0]["value"]

    assert len(candidates["country_of_origin"]) >= 1
    assert "USA" in candidates["country_of_origin"][0]["value"]

    assert len(candidates["warnings"]) >= 1
    assert "Federal law restricts this device" in candidates["warnings"][0]["value"]

    assert len(candidates["storage_conditions"]) >= 1
    assert "Store between 15°C and 25°C" in candidates["storage_conditions"][0]["value"]

    assert len(candidates["rx_only"]) >= 1
