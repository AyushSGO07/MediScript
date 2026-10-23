import re
import os
from typing import List, Dict, Any, Optional
from app.schemas.ai_assistance import CandidateEntitySuggestion, ClinicalImpactSummary
from app.services.entity_extraction import EntityExtractionService
from app.services.entity_patterns import CANONICAL_FIELD_SPECS
from app.services.diff_engine import DiffCategory, DiffType


class AIAssistanceService:
    """
    Bounded AI assistance service providing structured entity suggestions and
    deterministic clinical/regulatory risk summaries for label revisions.
    Guarantees 100% deterministic operation when offline (AIAS-05).
    """

    @classmethod
    def suggest_entities(cls, text_blocks: List[Any]) -> List[CandidateEntitySuggestion]:
        """
        Analyzes raw text blocks and extracts candidate entity values with physical coordinates.
        Supports TextBlock ORM objects, Pydantic objects, or plain dictionaries.
        """
        standardized_blocks: List[Dict[str, Any]] = []
        for b in text_blocks:
            if isinstance(b, dict):
                standardized_blocks.append(b)
            else:
                standardized_blocks.append({
                    "id": getattr(b, "id", ""),
                    "text": getattr(b, "text", ""),
                    "page_number": getattr(b, "page_number", 1),
                    "block_index": getattr(b, "block_index", 0),
                    "norm_x0": getattr(b, "norm_x0", 0.0),
                    "norm_y0": getattr(b, "norm_y0", 0.0),
                    "norm_x1": getattr(b, "norm_x1", 1.0),
                    "norm_y1": getattr(b, "norm_y1", 1.0),
                })

        candidates_by_field = EntityExtractionService.extract_candidates_from_blocks(standardized_blocks)
        suggestions: List[CandidateEntitySuggestion] = []

        field_descriptions = {s["key"]: s["description"] for s in CANONICAL_FIELD_SPECS}

        for field_key, cand_list in candidates_by_field.items():
            for cand in cand_list:
                raw_val = (cand.get("value") or cand.get("raw_value") or cand.get("raw_snippet") or "").strip()
                if not raw_val:
                    continue

                notes = cand.get("notes") or f"Pattern match for {field_key} ({field_descriptions.get(field_key, 'Standard field')})"
                conf = cand.get("confidence", 0.88)

                suggestion = CandidateEntitySuggestion(
                    field_key=field_key,
                    suggested_value=raw_val,
                    confidence_score=round(float(conf), 2),
                    page_number=int(cand.get("page_number", 1)),
                    norm_x0=float(cand.get("norm_x0", 0.0)),
                    norm_y0=float(cand.get("norm_y0", 0.0)),
                    norm_x1=float(cand.get("norm_x1", 1.0)),
                    norm_y1=float(cand.get("norm_y1", 1.0)),
                    reasoning=notes,
                )
                suggestions.append(suggestion)

        return suggestions

    @classmethod
    def analyze_diff_clinical_impact(
        cls,
        change_type: str,
        category: str,
        baseline_text: Optional[str],
        revised_text: Optional[str],
        diff_id: str = "diff-unknown",
    ) -> ClinicalImpactSummary:
        """
        Analyzes a revision diff item and generates a plain-language clinical/regulatory
        impact summary and risk rating (High, Medium, Low).
        Operates deterministically without external LLM dependencies.
        """
        base = (baseline_text or "").strip()
        rev = (revised_text or "").strip()
        combined_text = f"{base} {rev}".lower()

        # 1. Clinical Safety, Warnings, & Contraindications
        if (
            category == DiffCategory.SAFETY
            or (
                category not in (DiffCategory.DATES, DiffCategory.IDENTIFIERS, DiffCategory.MANUFACTURER, "Storage")
                and any(term in combined_text for term in ["warning", "caution", "contraindicat", "rx only", "single use", "latex", "adverse", "hazard"])
            )
        ):
            return ClinicalImpactSummary(
                diff_id=diff_id,
                clinical_risk="High",
                regulatory_implication=(
                    "Alteration or deletion of safety warnings, contraindications, or prescription-only designations directly affects clinician operating protocol "
                    "and risk classification under ISO 14971."
                ),
                plain_language_summary=(
                    f"Clinical safety instruction or contraindication modified: '{rev or base}'."
                ),
                suggested_action=(
                    "Review Clinical Evaluation Report (CER) and update Risk Management File (RMF) to substantiate this modification."
                ),
                confidence_score=0.96,
            )

        # 2. Date & Sterility shelf-life differences
        if (
            category == DiffCategory.DATES
            or (
                category not in (DiffCategory.IDENTIFIERS, DiffCategory.MANUFACTURER, "Storage")
                and any(term in combined_text for term in ["expir", "use by", "shelf life", "steril", "eo", "gamma", "steam"])
            )
        ):
            return ClinicalImpactSummary(
                diff_id=diff_id,
                clinical_risk="High",
                regulatory_implication=(
                    "Modifications to expiration or sterility dating directly impact patient safety and sterility assurance. "
                    "An altered expiration date without stability data validation violates 21 CFR 801.4 and EU MDR Annex I Chapter III."
                ),
                plain_language_summary=(
                    f"Sterility shelf-life specification changed from '{base or '[empty]'}' to '{rev or '[empty]'}'."
                ),
                suggested_action=(
                    "Verify accelerated and real-time aging stability reports (ISO 11607) to confirm the sterility assurance level (SAL 10⁻⁶)."
                ),
                confidence_score=0.98,
            )

        # 3. Storage & Environmental parameters
        if (
            category in ("Storage", "storage")
            or any(term in combined_text for term in ["°c", "celsius", "fahrenheit", "store between", "humidity", "freeze", "sunlight"])
        ):
            return ClinicalImpactSummary(
                diff_id=diff_id,
                clinical_risk="Medium",
                regulatory_implication=(
                    "Thermal and environmental storage condition updates affect drug-eluting polymers or sensitive medical device components. "
                    "Deviations may cause physical degradation during transit or hospital storage."
                ),
                plain_language_summary=(
                    f"Storage condition modified from '{base or '[empty]'}' to '{rev or '[empty]'}'."
                ),
                suggested_action=(
                    "Cross-reference cold chain logistics qualification documents and ensure storage symbols align with ISO 15223-1."
                ),
                confidence_score=0.95,
            )

        # 4. Device Identifiers & UDI
        if (
            category == DiffCategory.IDENTIFIERS
            or any(term in combined_text for term in ["udi", "gtin", "ref", "lot", "batch", "serial", "model", "(01)"])
        ):
            return ClinicalImpactSummary(
                diff_id=diff_id,
                clinical_risk="Medium",
                regulatory_implication=(
                    "Modifications to UDI identifiers or catalog numbers affect global supply chain traceability and GUDID/EUDAMED registration. "
                    "Misaligned DI/PI values violate FDA 21 CFR 830 and EU MDR Article 27."
                ),
                plain_language_summary=(
                    f"Device traceability identifier changed from '{base or '[empty]'}' to '{rev or '[empty]'}'."
                ),
                suggested_action=(
                    "Confirm revised UDI-DI is validated in GUDID and passes GS1 Modulo 10 check digit verification."
                ),
                confidence_score=0.95,
            )

        # 5. Manufacturer, Legal Entity, & Address
        if (
            category == DiffCategory.MANUFACTURER
            or any(term in combined_text for term in ["street", "suite", "road", "ave", "boulevard", "address", "way", "inc", "corp", "ltd", "gmbh", "ec rep", "authorized rep"])
        ):
            return ClinicalImpactSummary(
                diff_id=diff_id,
                clinical_risk="Low",
                regulatory_implication=(
                    "Legal entity or manufacturing facility address updates require regulatory establishment registration updates "
                    "under 21 CFR 807, without direct patient bio-compatibility hazard."
                ),
                plain_language_summary=(
                    f"Manufacturer corporate address updated from '{base or '[empty]'}' to '{rev or '[empty]'}'."
                ),
                suggested_action=(
                    "Verify corporate certificate of incorporation and ensure authorized representative (EC REP) contract is updated."
                ),
                confidence_score=0.92,
            )

        # 6. General / Layout text updates
        return ClinicalImpactSummary(
            diff_id=diff_id,
            clinical_risk="Low",
            regulatory_implication=(
                "General artwork or typographical revision. Ensure legibility and font compliance under MDR Annex I Clause 23."
            ),
            plain_language_summary=(
                f"Label text updated from '{base[:60] if base else '[empty]'}' to '{rev[:60] if rev else '[empty]'}'."
            ),
            suggested_action=(
                "Perform typographical proofing and confirm artwork complies with minimum font size guidelines."
            ),
            confidence_score=0.90,
        )
