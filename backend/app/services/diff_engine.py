import re
import difflib
import unicodedata
from typing import Dict, Any, List, Optional, Tuple


class DiffType:
    ADDED = "ADDED"
    DELETED = "DELETED"
    MODIFIED = "MODIFIED"
    UNCHANGED = "UNCHANGED"

    ALL = {ADDED, DELETED, MODIFIED, UNCHANGED}


class DiffCategory:
    IDENTIFIERS = "Identifiers"
    DATES = "Dates"
    MANUFACTURER = "Manufacturer"
    SAFETY = "Safety"
    REGULATORY = "Regulatory"
    GENERAL = "General"

    ALL = {IDENTIFIERS, DATES, MANUFACTURER, SAFETY, REGULATORY, GENERAL}


class DiffEngineService:
    @staticmethod
    def normalize_text(text: Optional[str]) -> str:
        """
        Normalizes whitespace, line breaks, unicode quotes, dashes, and invisible marks.
        Ensures layout wrapping differences in PDFs do not trigger spurious text diffs.
        """
        if not text:
            return ""

        # Normalize unicode characters (NFKC)
        normalized = unicodedata.normalize("NFKC", text)

        # Standardize hyphens and dashes to ASCII '-'
        normalized = re.sub(r"[\u2010\u2011\u2012\u2013\u2014\u2212\ufe58\ufe63\uff0d]", "-", normalized)

        # Standardize quotes to ASCII ' and "
        normalized = re.sub(r"[\u2018\u2019\u201a\u201b\u2032]", "'", normalized)
        normalized = re.sub(r"[\u201c\u201d\u201e\u201f\u2033]", '"', normalized)

        # Remove zero-width spaces, soft hyphens, directional marks
        normalized = re.sub(r"[\u200b\u200c\u200d\ufeff\u00ad]", "", normalized)

        # Collapse all whitespace sequences (newlines, tabs, multiple spaces) into a single space
        normalized = re.sub(r"\s+", " ", normalized).strip()

        return normalized

    @staticmethod
    def tokenize_words(text: str) -> List[str]:
        """Splits normalized text into word tokens while preserving attached punctuation."""
        if not text:
            return []
        return [w for w in text.split(" ") if w]

    @classmethod
    def compute_word_diff(cls, base_text: str, rev_text: str) -> Dict[str, Any]:
        """
        Performs word-level sequence matching between two text strings using difflib.
        Returns a dictionary with change_type and list of token dicts.
        """
        norm_base = cls.normalize_text(base_text)
        norm_rev = cls.normalize_text(rev_text)

        if norm_base == norm_rev:
            return {
                "change_type": DiffType.UNCHANGED,
                "tokens": [{"text": norm_base, "type": "equal"}] if norm_base else [],
            }

        base_words = cls.tokenize_words(norm_base)
        rev_words = cls.tokenize_words(norm_rev)

        matcher = difflib.SequenceMatcher(None, base_words, rev_words, autojunk=False)
        tokens: List[Dict[str, str]] = []

        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag == "equal":
                tokens.append({"text": " ".join(base_words[i1:i2]), "type": "equal"})
            elif tag == "replace":
                tokens.append({"text": " ".join(base_words[i1:i2]), "type": "delete"})
                tokens.append({"text": " ".join(rev_words[j1:j2]), "type": "insert"})
            elif tag == "delete":
                tokens.append({"text": " ".join(base_words[i1:i2]), "type": "delete"})
            elif tag == "insert":
                tokens.append({"text": " ".join(rev_words[j1:j2]), "type": "insert"})

        return {
            "change_type": DiffType.MODIFIED,
            "tokens": tokens,
        }

    @classmethod
    def categorize_text_change(cls, text: str) -> str:
        """
        Heuristically classifies changed text into regulatory label categories:
        Identifiers, Dates, Manufacturer, Safety, Regulatory, or General.
        """
        if not text:
            return DiffCategory.GENERAL

        lower = text.lower()

        # 1. Safety
        safety_keywords = [
            "warning", "caution", "contraindication", "adverse", "danger", "precaution",
            "sterile", "sterilized", "sterilization", "non-sterile",
            "single use", "single patient", "patient use", "do not reuse", "reuse", "rx only", "prescription only",
            "temperature", "store between", "do not freeze", "protect from",
            "latex", "hazard", "pyrogen", "mri", "magnetic resonance", "biological risk",
        ]
        if any(kw in lower for kw in safety_keywords):
            return DiffCategory.SAFETY

        # 2. Identifiers
        id_keywords = [
            "udi", "gtin", "ref", "lot", "batch", "serial", "catalog", "model",
            "part no", "sn ", "sn:", "ref:", "lot:", "(01)", "(17)", "(10)", "(21)"
        ]
        if any(kw in lower for kw in id_keywords):
            return DiffCategory.IDENTIFIERS

        # 3. Dates
        date_keywords = [
            "exp", "expiry", "expiration", "mfg", "manufacture date",
            "use by", "shelf life", "valid until",
        ]
        has_iso_date = bool(re.search(r"\b\d{4}-\d{2}-\d{2}\b", text))
        if any(kw in lower for kw in date_keywords) or has_iso_date:
            return DiffCategory.DATES

        # 4. Regulatory
        reg_keywords = [
            "ce mark", "ce 0", "ce 1", "ce 2", "notified body", "mdr", "ivdr",
            "fda", "21 cfr", "iso 13485", "iso 15223", "directive", "conformity",
        ]
        if any(kw in lower for kw in reg_keywords) or re.search(r"\bce\s*\d{4}\b", lower):
            return DiffCategory.REGULATORY

        # 5. Manufacturer
        mfg_keywords = [
            "manufacturer", "manufactured by", "distributed by", "ec rep",
            "authorized representative", "legal manufacturer", "address",
            "made in", "country of origin", "phone", "email", "website",
        ]
        if any(kw in lower for kw in mfg_keywords):
            return DiffCategory.MANUFACTURER

        return DiffCategory.GENERAL

    @classmethod
    def calculate_significance(cls, category: str, change_type: str) -> str:
        """Determines regulatory significance rating (High, Medium, Low)."""
        if category in (DiffCategory.SAFETY, DiffCategory.IDENTIFIERS, DiffCategory.DATES):
            return "High"
        if category in (DiffCategory.REGULATORY, DiffCategory.MANUFACTURER):
            return "Medium"
        return "Low"

    @classmethod
    def _get_block_attr(cls, block: Any, attr: str, default: Any = None) -> Any:
        """Helper to extract an attribute from either a dict or an ORM object."""
        if isinstance(block, dict):
            return block.get(attr, default)
        return getattr(block, attr, default)

    @classmethod
    def diff_documents(
        cls,
        baseline_blocks: List[Any],
        revised_blocks: List[Any],
        include_unchanged: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        Compares baseline and revised text blocks deterministically using SequenceMatcher.
        Produces structured diff items mapping exact text and bounding-box coordinates on both sides.
        """
        # Normalize text for each block
        norm_base_texts = [
            cls.normalize_text(cls._get_block_attr(b, "text", ""))
            for b in baseline_blocks
        ]
        norm_rev_texts = [
            cls.normalize_text(cls._get_block_attr(r, "text", ""))
            for r in revised_blocks
        ]

        matcher = difflib.SequenceMatcher(None, norm_base_texts, norm_rev_texts, autojunk=False)
        diff_items: List[Dict[str, Any]] = []

        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag == "equal":
                if include_unchanged:
                    for idx_offset in range(i2 - i1):
                        b_idx = i1 + idx_offset
                        r_idx = j1 + idx_offset
                        base_b = baseline_blocks[b_idx]
                        rev_b = revised_blocks[r_idx]
                        text = norm_base_texts[b_idx]
                        if not text:
                            continue
                        cat = cls.categorize_text_change(text)
                        diff_items.append({
                            "change_type": DiffType.UNCHANGED,
                            "category": cat,
                            "significance": cls.calculate_significance(cat, DiffType.UNCHANGED),
                            "baseline_text": text,
                            "revised_text": text,
                            "baseline_page": cls._get_block_attr(base_b, "page_number"),
                            "revised_page": cls._get_block_attr(rev_b, "page_number"),
                            "baseline_block_id": str(cls._get_block_attr(base_b, "id", f"b_{b_idx}")),
                            "revised_block_id": str(cls._get_block_attr(rev_b, "id", f"r_{r_idx}")),
                            "baseline_norm_x0": cls._get_block_attr(base_b, "norm_x0"),
                            "baseline_norm_y0": cls._get_block_attr(base_b, "norm_y0"),
                            "baseline_norm_x1": cls._get_block_attr(base_b, "norm_x1"),
                            "baseline_norm_y1": cls._get_block_attr(base_b, "norm_y1"),
                            "revised_norm_x0": cls._get_block_attr(rev_b, "norm_x0"),
                            "revised_norm_y0": cls._get_block_attr(rev_b, "norm_y0"),
                            "revised_norm_x1": cls._get_block_attr(rev_b, "norm_x1"),
                            "revised_norm_y1": cls._get_block_attr(rev_b, "norm_y1"),
                            "token_diffs": [{"text": text, "type": "equal"}],
                        })

            elif tag == "replace":
                base_count = i2 - i1
                rev_count = j2 - j1

                # If equal counts, pair blocks 1:1
                if base_count == rev_count:
                    for offset in range(base_count):
                        b_idx = i1 + offset
                        r_idx = j1 + offset
                        base_b = baseline_blocks[b_idx]
                        rev_b = revised_blocks[r_idx]
                        b_text = norm_base_texts[b_idx]
                        r_text = norm_rev_texts[r_idx]

                        word_res = cls.compute_word_diff(b_text, r_text)
                        if word_res["change_type"] == DiffType.UNCHANGED:
                            if include_unchanged:
                                cat = cls.categorize_text_change(b_text)
                                diff_items.append({
                                    "change_type": DiffType.UNCHANGED,
                                    "category": cat,
                                    "significance": cls.calculate_significance(cat, DiffType.UNCHANGED),
                                    "baseline_text": b_text,
                                    "revised_text": r_text,
                                    "baseline_page": cls._get_block_attr(base_b, "page_number"),
                                    "revised_page": cls._get_block_attr(rev_b, "page_number"),
                                    "baseline_block_id": str(cls._get_block_attr(base_b, "id", f"b_{b_idx}")),
                                    "revised_block_id": str(cls._get_block_attr(rev_b, "id", f"r_{r_idx}")),
                                    "baseline_norm_x0": cls._get_block_attr(base_b, "norm_x0"),
                                    "baseline_norm_y0": cls._get_block_attr(base_b, "norm_y0"),
                                    "baseline_norm_x1": cls._get_block_attr(base_b, "norm_x1"),
                                    "baseline_norm_y1": cls._get_block_attr(base_b, "norm_y1"),
                                    "revised_norm_x0": cls._get_block_attr(rev_b, "norm_x0"),
                                    "revised_norm_y0": cls._get_block_attr(rev_b, "norm_y0"),
                                    "revised_norm_x1": cls._get_block_attr(rev_b, "norm_x1"),
                                    "revised_norm_y1": cls._get_block_attr(rev_b, "norm_y1"),
                                    "token_diffs": word_res["tokens"],
                                })
                        else:
                            # Check similarity: if almost no similarity, treat as 1 DELETED and 1 ADDED
                            sim_ratio = difflib.SequenceMatcher(
                                None, cls.tokenize_words(b_text), cls.tokenize_words(r_text)
                            ).ratio()

                            if sim_ratio < 0.25:
                                # Deletion of baseline block
                                cat_b = cls.categorize_text_change(b_text)
                                diff_items.append({
                                    "change_type": DiffType.DELETED,
                                    "category": cat_b,
                                    "significance": cls.calculate_significance(cat_b, DiffType.DELETED),
                                    "baseline_text": b_text,
                                    "revised_text": None,
                                    "baseline_page": cls._get_block_attr(base_b, "page_number"),
                                    "revised_page": None,
                                    "baseline_block_id": str(cls._get_block_attr(base_b, "id", f"b_{b_idx}")),
                                    "revised_block_id": None,
                                    "baseline_norm_x0": cls._get_block_attr(base_b, "norm_x0"),
                                    "baseline_norm_y0": cls._get_block_attr(base_b, "norm_y0"),
                                    "baseline_norm_x1": cls._get_block_attr(base_b, "norm_x1"),
                                    "baseline_norm_y1": cls._get_block_attr(base_b, "norm_y1"),
                                    "revised_norm_x0": None,
                                    "revised_norm_y0": None,
                                    "revised_norm_x1": None,
                                    "revised_norm_y1": None,
                                    "token_diffs": [{"text": b_text, "type": "delete"}],
                                })
                                # Addition of revised block
                                cat_r = cls.categorize_text_change(r_text)
                                diff_items.append({
                                    "change_type": DiffType.ADDED,
                                    "category": cat_r,
                                    "significance": cls.calculate_significance(cat_r, DiffType.ADDED),
                                    "baseline_text": None,
                                    "revised_text": r_text,
                                    "baseline_page": None,
                                    "revised_page": cls._get_block_attr(rev_b, "page_number"),
                                    "baseline_block_id": None,
                                    "revised_block_id": str(cls._get_block_attr(rev_b, "id", f"r_{r_idx}")),
                                    "baseline_norm_x0": None,
                                    "baseline_norm_y0": None,
                                    "baseline_norm_x1": None,
                                    "baseline_norm_y1": None,
                                    "revised_norm_x0": cls._get_block_attr(rev_b, "norm_x0"),
                                    "revised_norm_y0": cls._get_block_attr(rev_b, "norm_y0"),
                                    "revised_norm_x1": cls._get_block_attr(rev_b, "norm_x1"),
                                    "revised_norm_y1": cls._get_block_attr(rev_b, "norm_y1"),
                                    "token_diffs": [{"text": r_text, "type": "insert"}],
                                })
                            else:
                                combined = f"{b_text} {r_text}"
                                cat = cls.categorize_text_change(combined)
                                diff_items.append({
                                    "change_type": DiffType.MODIFIED,
                                    "category": cat,
                                    "significance": cls.calculate_significance(cat, DiffType.MODIFIED),
                                    "baseline_text": b_text,
                                    "revised_text": r_text,
                                    "baseline_page": cls._get_block_attr(base_b, "page_number"),
                                    "revised_page": cls._get_block_attr(rev_b, "page_number"),
                                    "baseline_block_id": str(cls._get_block_attr(base_b, "id", f"b_{b_idx}")),
                                    "revised_block_id": str(cls._get_block_attr(rev_b, "id", f"r_{r_idx}")),
                                    "baseline_norm_x0": cls._get_block_attr(base_b, "norm_x0"),
                                    "baseline_norm_y0": cls._get_block_attr(base_b, "norm_y0"),
                                    "baseline_norm_x1": cls._get_block_attr(base_b, "norm_x1"),
                                    "baseline_norm_y1": cls._get_block_attr(base_b, "norm_y1"),
                                    "revised_norm_x0": cls._get_block_attr(rev_b, "norm_x0"),
                                    "revised_norm_y0": cls._get_block_attr(rev_b, "norm_y0"),
                                    "revised_norm_x1": cls._get_block_attr(rev_b, "norm_x1"),
                                    "revised_norm_y1": cls._get_block_attr(rev_b, "norm_y1"),
                                    "token_diffs": word_res["tokens"],
                                })
                else:
                    # Unequal counts: find best matching block pairs with similarity >= 0.3
                    matched_base = set()
                    matched_rev = set()

                    candidate_pairs: List[Tuple[float, int, int]] = []
                    for b_offset in range(base_count):
                        b_idx = i1 + b_offset
                        b_txt = norm_base_texts[b_idx]
                        if not b_txt:
                            continue
                        for r_offset in range(rev_count):
                            r_idx = j1 + r_offset
                            r_txt = norm_rev_texts[r_idx]
                            if not r_txt:
                                continue
                            sim = difflib.SequenceMatcher(None, b_txt, r_txt).ratio()
                            if sim >= 0.3:
                                candidate_pairs.append((sim, b_idx, r_idx))

                    # Sort highest similarity first
                    candidate_pairs.sort(key=lambda x: x[0], reverse=True)
                    for sim, b_idx, r_idx in candidate_pairs:
                        if b_idx in matched_base or r_idx in matched_rev:
                            continue
                        matched_base.add(b_idx)
                        matched_rev.add(r_idx)

                        base_b = baseline_blocks[b_idx]
                        rev_b = revised_blocks[r_idx]
                        b_text = norm_base_texts[b_idx]
                        r_text = norm_rev_texts[r_idx]

                        word_res = cls.compute_word_diff(b_text, r_text)
                        combined = f"{b_text} {r_text}"
                        cat = cls.categorize_text_change(combined)
                        diff_items.append({
                            "change_type": DiffType.MODIFIED,
                            "category": cat,
                            "significance": cls.calculate_significance(cat, DiffType.MODIFIED),
                            "baseline_text": b_text,
                            "revised_text": r_text,
                            "baseline_page": cls._get_block_attr(base_b, "page_number"),
                            "revised_page": cls._get_block_attr(rev_b, "page_number"),
                            "baseline_block_id": str(cls._get_block_attr(base_b, "id", f"b_{b_idx}")),
                            "revised_block_id": str(cls._get_block_attr(rev_b, "id", f"r_{r_idx}")),
                            "baseline_norm_x0": cls._get_block_attr(base_b, "norm_x0"),
                            "baseline_norm_y0": cls._get_block_attr(base_b, "norm_y0"),
                            "baseline_norm_x1": cls._get_block_attr(base_b, "norm_x1"),
                            "baseline_norm_y1": cls._get_block_attr(base_b, "norm_y1"),
                            "revised_norm_x0": cls._get_block_attr(rev_b, "norm_x0"),
                            "revised_norm_y0": cls._get_block_attr(rev_b, "norm_y0"),
                            "revised_norm_x1": cls._get_block_attr(rev_b, "norm_x1"),
                            "revised_norm_y1": cls._get_block_attr(rev_b, "norm_y1"),
                            "token_diffs": word_res["tokens"],
                        })

                    # Unpaired baseline blocks are DELETED
                    for b_offset in range(base_count):
                        b_idx = i1 + b_offset
                        if b_idx not in matched_base:
                            base_b = baseline_blocks[b_idx]
                            b_text = norm_base_texts[b_idx]
                            if not b_text:
                                continue
                            cat = cls.categorize_text_change(b_text)
                            diff_items.append({
                                "change_type": DiffType.DELETED,
                                "category": cat,
                                "significance": cls.calculate_significance(cat, DiffType.DELETED),
                                "baseline_text": b_text,
                                "revised_text": None,
                                "baseline_page": cls._get_block_attr(base_b, "page_number"),
                                "revised_page": None,
                                "baseline_block_id": str(cls._get_block_attr(base_b, "id", f"b_{b_idx}")),
                                "revised_block_id": None,
                                "baseline_norm_x0": cls._get_block_attr(base_b, "norm_x0"),
                                "baseline_norm_y0": cls._get_block_attr(base_b, "norm_y0"),
                                "baseline_norm_x1": cls._get_block_attr(base_b, "norm_x1"),
                                "baseline_norm_y1": cls._get_block_attr(base_b, "norm_y1"),
                                "revised_norm_x0": None,
                                "revised_norm_y0": None,
                                "revised_norm_x1": None,
                                "revised_norm_y1": None,
                                "token_diffs": [{"text": b_text, "type": "delete"}],
                            })

                    # Unpaired revised blocks are ADDED
                    for r_offset in range(rev_count):
                        r_idx = j1 + r_offset
                        if r_idx not in matched_rev:
                            rev_b = revised_blocks[r_idx]
                            r_text = norm_rev_texts[r_idx]
                            if not r_text:
                                continue
                            cat = cls.categorize_text_change(r_text)
                            diff_items.append({
                                "change_type": DiffType.ADDED,
                                "category": cat,
                                "significance": cls.calculate_significance(cat, DiffType.ADDED),
                                "baseline_text": None,
                                "revised_text": r_text,
                                "baseline_page": None,
                                "revised_page": cls._get_block_attr(rev_b, "page_number"),
                                "baseline_block_id": None,
                                "revised_block_id": str(cls._get_block_attr(rev_b, "id", f"r_{r_idx}")),
                                "baseline_norm_x0": None,
                                "baseline_norm_y0": None,
                                "baseline_norm_x1": None,
                                "baseline_norm_y1": None,
                                "revised_norm_x0": cls._get_block_attr(rev_b, "norm_x0"),
                                "revised_norm_y0": cls._get_block_attr(rev_b, "norm_y0"),
                                "revised_norm_x1": cls._get_block_attr(rev_b, "norm_x1"),
                                "revised_norm_y1": cls._get_block_attr(rev_b, "norm_y1"),
                                "token_diffs": [{"text": r_text, "type": "insert"}],
                            })

            elif tag == "delete":
                for b_idx in range(i1, i2):
                    base_b = baseline_blocks[b_idx]
                    b_text = norm_base_texts[b_idx]
                    if not b_text:
                        continue
                    cat = cls.categorize_text_change(b_text)
                    diff_items.append({
                        "change_type": DiffType.DELETED,
                        "category": cat,
                        "significance": cls.calculate_significance(cat, DiffType.DELETED),
                        "baseline_text": b_text,
                        "revised_text": None,
                        "baseline_page": cls._get_block_attr(base_b, "page_number"),
                        "revised_page": None,
                        "baseline_block_id": str(cls._get_block_attr(base_b, "id", f"b_{b_idx}")),
                        "revised_block_id": None,
                        "baseline_norm_x0": cls._get_block_attr(base_b, "norm_x0"),
                        "baseline_norm_y0": cls._get_block_attr(base_b, "norm_y0"),
                        "baseline_norm_x1": cls._get_block_attr(base_b, "norm_x1"),
                        "baseline_norm_y1": cls._get_block_attr(base_b, "norm_y1"),
                        "revised_norm_x0": None,
                        "revised_norm_y0": None,
                        "revised_norm_x1": None,
                        "revised_norm_y1": None,
                        "token_diffs": [{"text": b_text, "type": "delete"}],
                    })

            elif tag == "insert":
                for r_idx in range(j1, j2):
                    rev_b = revised_blocks[r_idx]
                    r_text = norm_rev_texts[r_idx]
                    if not r_text:
                        continue
                    cat = cls.categorize_text_change(r_text)
                    diff_items.append({
                        "change_type": DiffType.ADDED,
                        "category": cat,
                        "significance": cls.calculate_significance(cat, DiffType.ADDED),
                        "baseline_text": None,
                        "revised_text": r_text,
                        "baseline_page": None,
                        "revised_page": cls._get_block_attr(rev_b, "page_number"),
                        "baseline_block_id": None,
                        "revised_block_id": str(cls._get_block_attr(rev_b, "id", f"r_{r_idx}")),
                        "baseline_norm_x0": None,
                        "baseline_norm_y0": None,
                        "baseline_norm_x1": None,
                        "baseline_norm_y1": None,
                        "revised_norm_x0": cls._get_block_attr(rev_b, "norm_x0"),
                        "revised_norm_y0": cls._get_block_attr(rev_b, "norm_y0"),
                        "revised_norm_x1": cls._get_block_attr(rev_b, "norm_x1"),
                        "revised_norm_y1": cls._get_block_attr(rev_b, "norm_y1"),
                        "token_diffs": [{"text": r_text, "type": "insert"}],
                    })

        return diff_items
