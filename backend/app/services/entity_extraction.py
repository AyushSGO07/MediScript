import re
from typing import Dict, Any, List, Optional
from app.services.entity_patterns import (
    CANONICAL_FIELD_SPECS,
    RE_GS1_UDI_DI,
    RE_GS1_UDI_FULL,
    RE_HIBC_UDI,
    RE_REF,
    RE_LOT,
    RE_SERIAL,
    RE_CE_NB,
    RE_CE_ONLY,
    RE_MANUFACTURER,
    RE_COUNTRY,
    RE_EXPIRY,
    RE_MFG_DATE,
    RE_WARNING,
    RE_CONTRAINDICATION,
    RE_STORAGE,
    RE_RX_ONLY,
    RE_STERILE,
    RE_SINGLE_USE,
)

class EntityExtractionService:
    @classmethod
    def extract_candidates_from_blocks(
        cls, blocks: List[Dict[str, Any]]
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Inspects structured text blocks and extracts candidate medical device entities
        with exact coordinate citations and text snippets.

        Returns:
            Dict[field_key, List[CandidateDict]]
        """
        candidates: Dict[str, List[Dict[str, Any]]] = {
            spec["key"]: [] for spec in CANONICAL_FIELD_SPECS
        }

        for block in blocks:
            text = block.get("text", "")
            if not text:
                continue

            page_number = block.get("page_number", 1)
            block_index = block.get("block_index", 0)
            block_id = block.get("id")
            norm_x0 = block.get("norm_x0", 0.0)
            norm_y0 = block.get("norm_y0", 0.0)
            norm_x1 = block.get("norm_x1", 0.0)
            norm_y1 = block.get("norm_y1", 0.0)
            x0 = block.get("x0", 0.0)
            y0 = block.get("y0", 0.0)
            x1 = block.get("x1", 0.0)
            y1 = block.get("y1", 0.0)

            def add_candidate(field_key: str, matched_val: str, raw_snippet: str):
                val = matched_val.strip()
                if not val:
                    return
                candidates[field_key].append({
                    "field_key": field_key,
                    "value": val,
                    "raw_snippet": raw_snippet.strip(),
                    "evidence_text": text.strip(),
                    "page_number": page_number,
                    "block_index": block_index,
                    "block_id": block_id,
                    "x0": x0,
                    "y0": y0,
                    "x1": x1,
                    "y1": y1,
                    "norm_x0": norm_x0,
                    "norm_y0": norm_y0,
                    "norm_x1": norm_x1,
                    "norm_y1": norm_y1,
                })

            # 1. GS1 UDI Full / DI / PI
            m_full = RE_GS1_UDI_FULL.search(text)
            if m_full:
                add_candidate("udi_full", m_full.group(0), m_full.group(0))

            m_hibc = RE_HIBC_UDI.search(text)
            if m_hibc and not m_full:
                add_candidate("udi_full", m_hibc.group(0), m_hibc.group(0))

            m_di = RE_GS1_UDI_DI.search(text)
            if m_di:
                add_candidate("udi_di", m_di.group(1), m_di.group(0))

            # Look for GS1 PI elements: (17) Expiry, (10) LOT, (21) SN
            pi_elements = re.findall(r"\((17|10|21)\)([A-Za-z0-9\-]+)", text)
            if pi_elements:
                pi_str = "".join(f"({ai}){val}" for ai, val in pi_elements)
                add_candidate("udi_pi", pi_str, pi_str)
                for ai, val in pi_elements:
                    if ai == "10":
                        add_candidate("lot_batch", val, f"(10){val}")
                    elif ai == "21":
                        add_candidate("serial_number", val, f"(21){val}")
                    elif ai == "17":
                        add_candidate("expiration_date", f"(17){val}", f"(17){val}")

            # 2. REF / Catalogue Number
            m_ref = RE_REF.search(text)
            if m_ref:
                add_candidate("model_ref", m_ref.group(1), m_ref.group(0))

            # 3. LOT / Batch
            m_lot = RE_LOT.search(text)
            if m_lot:
                add_candidate("lot_batch", m_lot.group(1), m_lot.group(0))

            # 4. Serial Number
            m_sn = RE_SERIAL.search(text)
            if m_sn:
                add_candidate("serial_number", m_sn.group(1), m_sn.group(0))

            # 5. CE Mark & Notified Body
            m_ce_nb = RE_CE_NB.search(text)
            if m_ce_nb:
                add_candidate("ce_mark", "CE Marked", m_ce_nb.group(0))
                add_candidate("notified_body_id", m_ce_nb.group(1), m_ce_nb.group(0))
            elif RE_CE_ONLY.search(text):
                add_candidate("ce_mark", "CE Marked", "CE")

            # 6. Manufacturer & Address
            m_mfg = RE_MANUFACTURER.search(text)
            if m_mfg:
                name = m_mfg.group(1)
                address = m_mfg.group(2)
                add_candidate("manufacturer_name", name, m_mfg.group(0))
                if address:
                    add_candidate("manufacturer_address", address, address)

            # 7. Country of Origin
            m_country = RE_COUNTRY.search(text)
            if m_country:
                add_candidate("country_of_origin", m_country.group(1), m_country.group(0))

            # 8. Expiry and Manufacturing dates (raw pattern fallback if not in GS1)
            m_exp = RE_EXPIRY.search(text)
            if m_exp:
                add_candidate("expiration_date", m_exp.group(1), m_exp.group(0))

            m_mfg_date = RE_MFG_DATE.search(text)
            if m_mfg_date:
                add_candidate("manufacturing_date", m_mfg_date.group(1), m_mfg_date.group(0))

            # 9. Safety: Warnings, Precautions, Contraindications, Storage
            m_warn = RE_WARNING.search(text)
            if m_warn:
                add_candidate("warnings", m_warn.group(1), m_warn.group(0))

            m_contra = RE_CONTRAINDICATION.search(text)
            if m_contra:
                add_candidate("contraindications", m_contra.group(1), m_contra.group(0))

            m_store = RE_STORAGE.search(text)
            if m_store:
                add_candidate("storage_conditions", m_store.group(1), m_store.group(0))

            # 10. Regulatory symbols
            if RE_RX_ONLY.search(text):
                add_candidate("rx_only", "Prescription Only (Rx Only)", text)

            if RE_STERILE.search(text):
                m_st = RE_STERILE.search(text)
                add_candidate("sterile", m_st.group(0).strip(), m_st.group(0))

            if RE_SINGLE_USE.search(text):
                add_candidate("single_use", "Do Not Re-use / Single Use", text)

        return candidates
