from typing import Dict, Any, List, Optional
from app.services.date_validator import DateValidatorService

class UncertaintyResolver:
    CONFIDENCE_EXTRACTED = "EXTRACTED"
    CONFIDENCE_AMBIGUOUS = "AMBIGUOUS"
    CONFIDENCE_NOT_READABLE = "NOT_READABLE"
    CONFIDENCE_NOT_FOUND = "NOT_FOUND"

    @classmethod
    def resolve_field(
        cls,
        field_spec: Dict[str, Any],
        candidates: List[Dict[str, Any]],
        has_text_layer: bool,
    ) -> Dict[str, Any]:
        """
        Determines the 4-state confidence classification for a single field specification.
        Resolves duplicates, handles date normalization, and checks for conflicting values.
        """
        field_key = field_spec["key"]
        field_label = field_spec["label"]
        category = field_spec["category"]

        # Case 1: Scanned/raster document with no text layer
        if not has_text_layer:
            return {
                "field_key": field_key,
                "field_label": field_label,
                "category": category,
                "value": None,
                "raw_value": None,
                "normalized_value": None,
                "confidence_state": cls.CONFIDENCE_NOT_READABLE,
                "evidence_text": "Scanned raster document (0 digital text blocks). OCR required.",
                "evidence_page": None,
                "evidence_block_id": None,
                "norm_x0": None, "norm_y0": None, "norm_x1": None, "norm_y1": None,
                "is_iso_compliant": None,
                "is_expired": None,
                "days_until_expiration": None,
            }

        # Case 2: Field not found anywhere in document
        if not candidates:
            return {
                "field_key": field_key,
                "field_label": field_label,
                "category": category,
                "value": None,
                "raw_value": None,
                "normalized_value": None,
                "confidence_state": cls.CONFIDENCE_NOT_FOUND,
                "evidence_text": None,
                "evidence_page": None,
                "evidence_block_id": None,
                "norm_x0": None, "norm_y0": None, "norm_x1": None, "norm_y1": None,
                "is_iso_compliant": None,
                "is_expired": None,
                "days_until_expiration": None,
            }

        # Deduplicate candidate values (normalized by stripping/casing)
        value_map: Dict[str, List[Dict[str, Any]]] = {}
        for c in candidates:
            val_clean = c["value"].strip()
            # Group case-insensitively for general text, preserve case for codes
            key = val_clean if field_key in ("lot_batch", "model_ref", "serial_number", "udi_di") else val_clean.lower()
            if key not in value_map:
                value_map[key] = []
            value_map[key].append(c)

        distinct_keys = list(value_map.keys())

        # If date field, perform date validation and normalization
        is_date_field = category == "dates" or field_key in ("expiration_date", "manufacturing_date")

        # Case 3: Conflicting candidates -> AMBIGUOUS
        if len(distinct_keys) > 1:
            primary_c = candidates[0]
            val = primary_c["value"]
            date_info = DateValidatorService.parse_and_validate(val) if is_date_field else {}
            conflicts = [candidates_group[0]["value"] for candidates_group in value_map.values()]

            return {
                "field_key": field_key,
                "field_label": field_label,
                "category": category,
                "value": val,
                "raw_value": primary_c.get("raw_snippet", val),
                "normalized_value": date_info.get("normalized_value"),
                "confidence_state": cls.CONFIDENCE_AMBIGUOUS,
                "evidence_text": f"Ambiguous conflict between: {', '.join(conflicts)}. Primary candidate cited: '{primary_c['evidence_text']}'",
                "evidence_page": primary_c.get("page_number"),
                "evidence_block_id": primary_c.get("block_id"),
                "norm_x0": primary_c.get("norm_x0"),
                "norm_y0": primary_c.get("norm_y0"),
                "norm_x1": primary_c.get("norm_x1"),
                "norm_y1": primary_c.get("norm_y1"),
                "is_iso_compliant": date_info.get("is_iso_compliant"),
                "is_expired": date_info.get("is_expired"),
                "days_until_expiration": date_info.get("days_until_expiration"),
            }

        # Case 4: Unambiguous match -> EXTRACTED
        primary_c = candidates[0]
        val = primary_c["value"]
        date_info = DateValidatorService.parse_and_validate(val) if is_date_field else {}

        normalized_val = date_info.get("normalized_value") if is_date_field else val

        return {
            "field_key": field_key,
            "field_label": field_label,
            "category": category,
            "value": normalized_val or val,
            "raw_value": primary_c.get("raw_snippet", val),
            "normalized_value": normalized_val,
            "confidence_state": cls.CONFIDENCE_EXTRACTED,
            "evidence_text": primary_c.get("evidence_text"),
            "evidence_page": primary_c.get("page_number"),
            "evidence_block_id": primary_c.get("block_id"),
            "norm_x0": primary_c.get("norm_x0"),
            "norm_y0": primary_c.get("norm_y0"),
            "norm_x1": primary_c.get("norm_x1"),
            "norm_y1": primary_c.get("norm_y1"),
            "is_iso_compliant": date_info.get("is_iso_compliant"),
            "is_expired": date_info.get("is_expired"),
            "days_until_expiration": date_info.get("days_until_expiration"),
        }
