import re
import calendar
from datetime import datetime, timezone, date
from typing import Dict, Any, Optional

class DateValidatorService:
    # ISO 8601 patterns
    RE_ISO_FULL = re.compile(r"\b(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b")
    RE_ISO_MONTH = re.compile(r"\b(\d{4})-(0[1-9]|1[0-2])\b")
    
    # GS1 Application Identifier (17) YYMMDD
    RE_GS1_EXPIRY = re.compile(r"\(17\)(\d{2})(0[1-9]|1[0-2])(0[0-9]|[12]\d|3[01])")
    
    # Common packaging date variants
    RE_SLASH_FULL = re.compile(r"\b(0[1-9]|1[0-2])/(0[1-9]|[12]\d|3[01])/(\d{4})\b")
    RE_DASH_EU = re.compile(r"\b(0[1-9]|[12]\d|3[01])-(0[1-9]|1[0-2])-(\d{4})\b")
    RE_SLASH_MONTH = re.compile(r"\b(0[1-9]|1[0-2])/(\d{4})\b")

    @classmethod
    def parse_and_validate(
        cls, raw_text: str, reference_date: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Parses raw text to identify date candidates, normalizes to ISO 8601 (YYYY-MM-DD or YYYY-MM),
        determines ISO format compliance, and evaluates expiration relative to reference date.
        """
        if not raw_text or not isinstance(raw_text, str):
            return {
                "is_valid": False,
                "raw_value": "",
                "normalized_value": None,
                "is_iso_compliant": False,
                "is_expired": False,
                "days_until_expiration": None,
            }

        text = raw_text.strip()
        ref_date = reference_date or datetime.now(timezone.utc).date()

        # 1. Check GS1 (17)YYMMDD format
        m_gs1 = cls.RE_GS1_EXPIRY.search(text)
        if m_gs1:
            yy, mm, dd = int(m_gs1.group(1)), int(m_gs1.group(2)), int(m_gs1.group(3))
            year = 2000 + yy if yy < 50 else 1900 + yy
            if dd == 0:
                # 00 means last day of month in GS1 specification
                _, last_day = calendar.monthrange(year, mm)
                day = last_day
            else:
                day = dd

            try:
                parsed_date = date(year, mm, day)
                iso_str = parsed_date.isoformat()
                is_expired = parsed_date < ref_date
                days_left = (parsed_date - ref_date).days
                return {
                    "is_valid": True,
                    "raw_value": text,
                    "normalized_value": iso_str,
                    "is_iso_compliant": False,  # GS1 AI parenthetical is standard but not direct ISO-8601 string
                    "is_expired": is_expired,
                    "days_until_expiration": days_left,
                }
            except ValueError:
                pass

        # 2. Check strict ISO full YYYY-MM-DD
        m_iso_full = cls.RE_ISO_FULL.search(text)
        if m_iso_full:
            year, month, day = int(m_iso_full.group(1)), int(m_iso_full.group(2)), int(m_iso_full.group(3))
            try:
                parsed_date = date(year, month, day)
                iso_str = parsed_date.isoformat()
                is_expired = parsed_date < ref_date
                days_left = (parsed_date - ref_date).days
                return {
                    "is_valid": True,
                    "raw_value": text,
                    "normalized_value": iso_str,
                    "is_iso_compliant": True,
                    "is_expired": is_expired,
                    "days_until_expiration": days_left,
                }
            except ValueError:
                pass

        # 3. Check ISO month YYYY-MM
        m_iso_m = cls.RE_ISO_MONTH.search(text)
        if m_iso_m:
            year, month = int(m_iso_m.group(1)), int(m_iso_m.group(2))
            _, last_day = calendar.monthrange(year, month)
            parsed_date = date(year, month, last_day)
            iso_str = f"{year:04d}-{month:02d}"
            is_expired = parsed_date < ref_date
            days_left = (parsed_date - ref_date).days
            return {
                "is_valid": True,
                "raw_value": text,
                "normalized_value": iso_str,
                "is_iso_compliant": True,
                "is_expired": is_expired,
                "days_until_expiration": days_left,
            }

        # 4. Check Slash full MM/DD/YYYY
        m_slash = cls.RE_SLASH_FULL.search(text)
        if m_slash:
            month, day, year = int(m_slash.group(1)), int(m_slash.group(2)), int(m_slash.group(3))
            try:
                parsed_date = date(year, month, day)
                iso_str = parsed_date.isoformat()
                is_expired = parsed_date < ref_date
                days_left = (parsed_date - ref_date).days
                return {
                    "is_valid": True,
                    "raw_value": text,
                    "normalized_value": iso_str,
                    "is_iso_compliant": False,
                    "is_expired": is_expired,
                    "days_until_expiration": days_left,
                }
            except ValueError:
                pass

        # 5. Check Dash EU DD-MM-YYYY
        m_dash = cls.RE_DASH_EU.search(text)
        if m_dash:
            day, month, year = int(m_dash.group(1)), int(m_dash.group(2)), int(m_dash.group(3))
            try:
                parsed_date = date(year, month, day)
                iso_str = parsed_date.isoformat()
                is_expired = parsed_date < ref_date
                days_left = (parsed_date - ref_date).days
                return {
                    "is_valid": True,
                    "raw_value": text,
                    "normalized_value": iso_str,
                    "is_iso_compliant": False,
                    "is_expired": is_expired,
                    "days_until_expiration": days_left,
                }
            except ValueError:
                pass

        # 6. Check Slash month MM/YYYY
        m_slash_m = cls.RE_SLASH_MONTH.search(text)
        if m_slash_m:
            month, year = int(m_slash_m.group(1)), int(m_slash_m.group(2))
            _, last_day = calendar.monthrange(year, month)
            parsed_date = date(year, month, last_day)
            iso_str = f"{year:04d}-{month:02d}"
            is_expired = parsed_date < ref_date
            days_left = (parsed_date - ref_date).days
            return {
                "is_valid": True,
                "raw_value": text,
                "normalized_value": iso_str,
                "is_iso_compliant": False,
                "is_expired": is_expired,
                "days_until_expiration": days_left,
            }

        return {
            "is_valid": False,
            "raw_value": text,
            "normalized_value": None,
            "is_iso_compliant": False,
            "is_expired": False,
            "days_until_expiration": None,
        }
