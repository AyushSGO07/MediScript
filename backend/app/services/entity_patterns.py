import re
from typing import Dict, Any, List, Optional, Tuple

CANONICAL_FIELD_SPECS: List[Dict[str, Any]] = [
    # Identifiers
    {
        "key": "udi_di",
        "label": "UDI Device Identifier (DI)",
        "category": "identifiers",
        "description": "GS1 GTIN 14-digit device identifier or HIBC primary code",
    },
    {
        "key": "udi_pi",
        "label": "UDI Production Identifier (PI)",
        "category": "identifiers",
        "description": "GS1 production identifier containing lot, expiry, or serial data",
    },
    {
        "key": "udi_full",
        "label": "Full UDI String",
        "category": "identifiers",
        "description": "Complete UDI carrier string (human readable interpretation)",
    },
    {
        "key": "model_ref",
        "label": "Catalogue / REF Number",
        "category": "identifiers",
        "description": "Manufacturer model, catalog, or reference number",
    },
    {
        "key": "lot_batch",
        "label": "LOT / Batch Number",
        "category": "identifiers",
        "description": "Batch or lot identification code",
    },
    {
        "key": "serial_number",
        "label": "Serial Number (SN)",
        "category": "identifiers",
        "description": "Unique unit serial number",
    },
    # Dates
    {
        "key": "expiration_date",
        "label": "Expiration Date",
        "category": "dates",
        "description": "Use-by or expiration date (ISO 8601 YYYY-MM-DD or YYYY-MM)",
    },
    {
        "key": "manufacturing_date",
        "label": "Date of Manufacture",
        "category": "dates",
        "description": "Date when device was manufactured",
    },
    # Regulatory & Marks
    {
        "key": "ce_mark",
        "label": "CE Marking",
        "category": "regulatory",
        "description": "European Conformity CE marking status",
    },
    {
        "key": "notified_body_id",
        "label": "Notified Body Identification",
        "category": "regulatory",
        "description": "4-digit identification number of the notified body for CE marking",
    },
    {
        "key": "rx_only",
        "label": "Prescription Only (Rx Only)",
        "category": "regulatory",
        "description": "Caution: Federal law restricts device to sale by or on order of a physician",
    },
    {
        "key": "sterile",
        "label": "Sterilization Status",
        "category": "regulatory",
        "description": "Device sterilization status (e.g. STERILE, STERILE EO, STERILE R)",
    },
    {
        "key": "single_use",
        "label": "Do Not Re-use / Single Use",
        "category": "regulatory",
        "description": "Single-use only designation",
    },
    # Legal Manufacturer
    {
        "key": "manufacturer_name",
        "label": "Legal Manufacturer Name",
        "category": "manufacturer",
        "description": "Registered legal entity name responsible for the device",
    },
    {
        "key": "manufacturer_address",
        "label": "Manufacturer Address",
        "category": "manufacturer",
        "description": "Physical registered address of the manufacturer",
    },
    {
        "key": "country_of_origin",
        "label": "Country of Origin",
        "category": "manufacturer",
        "description": "Country where the device was manufactured",
    },
    # Safety & Storage
    {
        "key": "warnings",
        "label": "Warnings & Precautions",
        "category": "safety",
        "description": "Safety warnings and precautions statements",
    },
    {
        "key": "contraindications",
        "label": "Contraindications",
        "category": "safety",
        "description": "Clinical situations where the device must not be used",
    },
    {
        "key": "storage_conditions",
        "label": "Storage & Handling",
        "category": "safety",
        "description": "Temperature, humidity, and handling requirements",
    },
]

# Compiled Regex Patterns
RE_GS1_UDI_DI = re.compile(r"(?:\(01\)|01)(\d{14})", re.IGNORECASE)
RE_GS1_UDI_FULL = re.compile(r"\(01\)\d{14}(?:\([0-9]+\)[A-Za-z0-9\-]+)+", re.IGNORECASE)
RE_HIBC_UDI = re.compile(r"\+[A-Za-z0-9/]{6,30}", re.IGNORECASE)

RE_REF = re.compile(
    r"\b(?:REF|CAT|CATALOG|MODEL|ITEM)\s*(?:NO\.?|NUMBER|#)?[:\s]+([A-Za-z0-9\-_./]{2,30})\b",
    re.IGNORECASE,
)
RE_LOT = re.compile(
    r"\b(?:LOT|BATCH)\s*(?:NO\.?|NUMBER|#)?[:\s]+([A-Za-z0-9\-_./]{2,30})\b",
    re.IGNORECASE,
)
RE_SERIAL = re.compile(
    r"\b(?:SN|SERIAL)\s*(?:NO\.?|NUMBER|#)?[:\s]+([A-Za-z0-9\-_./]{2,30})\b",
    re.IGNORECASE,
)

RE_CE_NB = re.compile(r"\bCE\s*(\d{4})\b", re.IGNORECASE)
RE_CE_ONLY = re.compile(r"\bCE\b", re.IGNORECASE)

RE_MANUFACTURER = re.compile(
    r"\b(?:MANUFACTURED\s+BY|MANUFACTURER|LEGAL\s+MANUFACTURER)[:\s]+([^,\n]+?)(?:,\s*([^\n]+))?(?:\n|$)",
    re.IGNORECASE,
)
RE_COUNTRY = re.compile(
    r"\b(?:MADE\s+IN|COUNTRY\s+OF\s+ORIGIN[:\s]+)([A-Za-z\s]{3,30})\b",
    re.IGNORECASE,
)

RE_EXPIRY = re.compile(
    r"\b(?:EXP|EXPIRATION|USE\s*BY|EXPIRY)\s*(?:DATE)?[:\s]+([A-Za-z0-9\-/\.]{6,16})\b",
    re.IGNORECASE,
)
RE_MFG_DATE = re.compile(
    r"\b(?:MFG|MANUFACTURED|DOM|DATE\s+OF\s+MANUFACTURE)\s*(?:DATE)?[:\s]+([A-Za-z0-9\-/\.]{6,16})\b",
    re.IGNORECASE,
)

RE_WARNING = re.compile(
    r"\b(?:WARNING|CAUTION|PRECAUTION)S?[:\s]+([^\n]+)",
    re.IGNORECASE,
)
RE_CONTRAINDICATION = re.compile(
    r"\b(?:CONTRAINDICATION)S?[:\s]+([^\n]+)",
    re.IGNORECASE,
)
RE_STORAGE = re.compile(
    r"\b(?:STORE|STORAGE|TEMPERATURE|KEEP\s+DRY)[:\s]+([^\n]+)",
    re.IGNORECASE,
)

RE_RX_ONLY = re.compile(r"\b(?:RX\s*ONLY|PRESCRIPTION\s+ONLY|CAUTION:\s*FEDERAL\s+LAW)\b", re.IGNORECASE)
RE_STERILE = re.compile(r"\b(?:STERILE(?:\s+[A-Z]+)?)\b", re.IGNORECASE)
RE_SINGLE_USE = re.compile(r"\b(?:DO\s+NOT\s+REUSE|SINGLE\s+USE\s+ONLY|FOR\s+SINGLE\s+USE|SINGLE\s+USE)\b", re.IGNORECASE)
