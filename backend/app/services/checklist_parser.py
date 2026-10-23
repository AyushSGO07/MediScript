import csv
import io
import json
import re
from typing import List, Tuple, Optional, Dict, Any
from app.models.checklist import SeverityLevel, RuleType
from app.schemas.checklist import ChecklistCreate, ChecklistRuleCreate


class ChecklistParserService:
    # Regex detecting dangerous nested quantifiers causing exponential backtracking, e.g. (a+)+, (.*)*, (x+)*
    REDOS_NESTED_QUANTIFIER_REGEX = re.compile(
        r"(\([^\)\\]*(?:\\.[^\)\\]*)*[\+\*][^\)\\]*(?:\\.[^\)\\]*)*\)[\+\*])|"
        r"(\[[^\]\\]*(?:\\.[^\]\\]*)*\][\+\*][\+\*])|"
        r"(\((?:[a-zA-Z0-9_\s|]+[\+\*])+\)[\+\*])",
        re.IGNORECASE,
    )

    @classmethod
    def check_redos_safety(cls, pattern: str) -> Tuple[bool, Optional[str]]:
        """
        Validates that a regular expression compiles and does not exhibit obvious
        nested quantifiers leading to exponential catastrophic backtracking (ReDoS).
        """
        if not pattern or not pattern.strip():
            return True, None

        pat = pattern.strip()

        # Check for nested quantifiers
        if cls.REDOS_NESTED_QUANTIFIER_REGEX.search(pat):
            return False, "Unsafe regular expression: potential exponential backtracking (nested quantifiers detected)."

        # Check if regex compiles
        try:
            re.compile(pat)
        except re.error as e:
            return False, f"Invalid regular expression syntax: {str(e)}"

        return True, None

    @classmethod
    def parse_csv(cls, content: str) -> Tuple[List[ChecklistRuleCreate], List[str]]:
        """
        Parses CSV string into a list of validated ChecklistRuleCreate objects.
        Returns (rules, errors). If any errors exist, rules will be empty.
        """
        errors: List[str] = []
        rules: List[ChecklistRuleCreate] = []

        if not content or not content.strip():
            return [], ["CSV content is empty."]

        # Filter out comment lines starting with '#'
        filtered_lines = []
        for line in content.splitlines():
            stripped = line.strip()
            if stripped and not stripped.startswith("#"):
                filtered_lines.append(line)

        if not filtered_lines:
            return [], ["CSV file contains no data rows or header."]

        reader = csv.DictReader(filtered_lines)
        if not reader.fieldnames:
            return [], ["CSV file is missing a header row."]

        # Normalize header keys
        cleaned_headers = {h.strip().lower(): h for h in reader.fieldnames if h}
        required_fields = ["rule_key", "field_key", "description", "severity", "rule_type"]
        missing_fields = [f for f in required_fields if f not in cleaned_headers]

        if missing_fields:
            return [], [f"Missing required CSV columns: {', '.join(missing_fields)}. Required headers: rule_key, field_key, description, severity, rule_type, expected_value, enabled"]

        for row_idx, raw_row in enumerate(reader, start=2):
            row = {k.strip().lower(): (v.strip() if v else "") for k, v in raw_row.items() if k}

            rule_key = row.get("rule_key", "")
            field_key = row.get("field_key", "")
            description = row.get("description", "")
            severity_raw = row.get("severity", "")
            rule_type_raw = row.get("rule_type", "")
            expected_value = row.get("expected_value", "") or None
            enabled_raw = row.get("enabled", "true")

            if not rule_key:
                errors.append(f"Row {row_idx}: 'rule_key' cannot be empty.")
            if not field_key:
                errors.append(f"Row {row_idx}: 'field_key' cannot be empty.")
            if not description:
                errors.append(f"Row {row_idx}: 'description' cannot be empty.")

            severity = severity_raw.strip().title()
            if severity not in SeverityLevel.ALL:
                errors.append(f"Row {row_idx}: Invalid severity '{severity_raw}'. Allowed: {', '.join(sorted(SeverityLevel.ALL))}.")

            rule_type = rule_type_raw.strip().upper()
            if rule_type not in RuleType.ALL:
                errors.append(f"Row {row_idx}: Invalid rule_type '{rule_type_raw}'. Allowed: {', '.join(sorted(RuleType.ALL))}.")

            if rule_type == RuleType.FORMAT_REGEX:
                if not expected_value:
                    errors.append(f"Row {row_idx}: 'expected_value' is required for FORMAT_REGEX rule type.")
                else:
                    is_safe, err_msg = cls.check_redos_safety(expected_value)
                    if not is_safe:
                        errors.append(f"Row {row_idx}: Regex check failed: {err_msg}")

            enabled = True
            if enabled_raw.lower() in ("false", "0", "no", "disabled"):
                enabled = False

            if not errors:
                rules.append(
                    ChecklistRuleCreate(
                        rule_key=rule_key,
                        field_key=field_key,
                        description=description,
                        severity=severity,
                        rule_type=rule_type,
                        expected_value=expected_value,
                        enabled=enabled,
                    )
                )

        if errors:
            return [], errors

        return rules, []

    @classmethod
    def parse_json(cls, content: str) -> Tuple[Optional[ChecklistCreate], List[ChecklistRuleCreate], List[str]]:
        """
        Parses JSON checklist string into (ChecklistCreate, List[ChecklistRuleCreate], errors).
        """
        errors: List[str] = []
        if not content or not content.strip():
            return None, [], ["JSON content is empty."]

        try:
            data = json.loads(content)
        except json.JSONDecodeError as e:
            return None, [], [f"Malformed JSON: {str(e)}"]

        if not isinstance(data, dict):
            return None, [], ["JSON root must be an object."]

        name = data.get("name", "").strip()
        jurisdiction = data.get("jurisdiction", "").strip()
        if not name:
            errors.append("Checklist 'name' is required.")
        if not jurisdiction:
            errors.append("Checklist 'jurisdiction' is required.")

        rules_raw = data.get("rules", [])
        if not isinstance(rules_raw, list):
            errors.append("'rules' must be a JSON array.")
            return None, [], errors

        rules: List[ChecklistRuleCreate] = []
        for idx, r in enumerate(rules_raw, start=1):
            if not isinstance(r, dict):
                errors.append(f"Rule #{idx} must be a JSON object.")
                continue

            rule_key = str(r.get("rule_key", "")).strip()
            field_key = str(r.get("field_key", "")).strip()
            description = str(r.get("description", "")).strip()
            severity_raw = str(r.get("severity", "Major")).strip().title()
            rule_type_raw = str(r.get("rule_type", "REQUIRED_PRESENCE")).strip().upper()
            expected_value = r.get("expected_value")
            if expected_value is not None:
                expected_value = str(expected_value)
            enabled = bool(r.get("enabled", True))

            if not rule_key:
                errors.append(f"Rule #{idx}: 'rule_key' cannot be empty.")
            if not field_key:
                errors.append(f"Rule #{idx}: 'field_key' cannot be empty.")
            if not description:
                errors.append(f"Rule #{idx}: 'description' cannot be empty.")

            if severity_raw not in SeverityLevel.ALL:
                errors.append(f"Rule #{idx}: Invalid severity '{severity_raw}'. Allowed: {', '.join(sorted(SeverityLevel.ALL))}.")

            if rule_type_raw not in RuleType.ALL:
                errors.append(f"Rule #{idx}: Invalid rule_type '{rule_type_raw}'. Allowed: {', '.join(sorted(RuleType.ALL))}.")

            if rule_type_raw == RuleType.FORMAT_REGEX:
                if not expected_value:
                    errors.append(f"Rule #{idx}: 'expected_value' is required for FORMAT_REGEX rule type.")
                else:
                    is_safe, err_msg = cls.check_redos_safety(expected_value)
                    if not is_safe:
                        errors.append(f"Rule #{idx}: Regex check failed: {err_msg}")

            if not errors:
                rules.append(
                    ChecklistRuleCreate(
                        rule_key=rule_key,
                        field_key=field_key,
                        description=description,
                        severity=severity_raw,
                        rule_type=rule_type_raw,
                        expected_value=expected_value,
                        enabled=enabled,
                    )
                )

        if errors:
            return None, [], errors

        checklist_create = ChecklistCreate(
            name=name,
            description=data.get("description"),
            jurisdiction=jurisdiction,
            source_reference=data.get("source_reference"),
            is_demonstration=bool(data.get("is_demonstration", False)),
            initial_version=data.get("version", "v1.0.0"),
            rules=rules,
        )

        return checklist_create, rules, []

    @classmethod
    def generate_csv_template(cls) -> str:
        """
        Generates standard CSV checklist starter template with comment guide and sample rules.
        """
        output = io.StringIO()
        output.write("# MediScript Regulatory Checklist CSV Template\n")
        output.write("# Columns: rule_key, field_key, description, severity, rule_type, expected_value, enabled\n")
        output.write("# Severities: Critical | Major | Minor\n")
        output.write("# Rule Types: REQUIRED_PRESENCE | FORMAT_REGEX | VALUE_MATCH | DATE_EXPIRATION | CROSS_FIELD_MATCH\n")
        output.write("#\n")

        writer = csv.writer(output)
        writer.writerow(["rule_key", "field_key", "description", "severity", "rule_type", "expected_value", "enabled"])
        writer.writerow(["DEMO_UDI_DI_REQUIRED", "udi_di", "Unique Device Identifier (DI) must be present on label", "Critical", "REQUIRED_PRESENCE", "", "true"])
        writer.writerow(["DEMO_EXP_DATE_ISO", "expiration_date", "Expiration date must conform to ISO 8601 (YYYY-MM-DD)", "Critical", "FORMAT_REGEX", r"^\d{4}-\d{2}-\d{2}$", "true"])
        writer.writerow(["DEMO_MFG_NAME_REQ", "manufacturer_name", "Legal manufacturer name must appear prominently", "Major", "REQUIRED_PRESENCE", "", "true"])
        writer.writerow(["DEMO_STORAGE_COND", "storage_conditions", "Specific storage conditions must be documented", "Minor", "REQUIRED_PRESENCE", "", "true"])

        return output.getvalue()

    @classmethod
    def generate_json_template(cls) -> str:
        """
        Generates standard JSON checklist starter template.
        """
        template_obj = {
            "name": "Custom Medical Device Labeling Checklist",
            "jurisdiction": "FDA (US)",
            "source_reference": "21 CFR 801 Subpart B",
            "version": "v1.0.0",
            "effective_date": "2024-01-01",
            "description": "Standard checklist template for medical device verification.",
            "is_demonstration": False,
            "rules": [
                {
                    "rule_key": "SAMPLE_UDI_DI_REQUIRED",
                    "field_key": "udi_di",
                    "description": "Device Identifier (DI) must be present on the medical device label.",
                    "severity": "Critical",
                    "rule_type": "REQUIRED_PRESENCE",
                    "expected_value": None,
                    "enabled": True,
                },
                {
                    "rule_key": "SAMPLE_EXPIRY_ISO_FORMAT",
                    "field_key": "expiration_date",
                    "description": "Expiration date must be formatted in ISO 8601 standard (YYYY-MM-DD).",
                    "severity": "Critical",
                    "rule_type": "FORMAT_REGEX",
                    "expected_value": r"^\d{4}-\d{2}-\d{2}$",
                    "enabled": True,
                },
                {
                    "rule_key": "SAMPLE_MFG_NAME_REQUIRED",
                    "field_key": "manufacturer_name",
                    "description": "Legal manufacturer name must be present on the primary packaging.",
                    "severity": "Major",
                    "rule_type": "REQUIRED_PRESENCE",
                    "expected_value": None,
                    "enabled": True,
                },
            ],
        }
        return json.dumps(template_obj, indent=2)

    @classmethod
    def export_version_csv(cls, rules: List[Any]) -> str:
        """
        Exports a list of ChecklistRule objects or dicts to a CSV string.
        """
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["rule_key", "field_key", "description", "severity", "rule_type", "expected_value", "enabled"])

        for r in rules:
            writer.writerow([
                getattr(r, "rule_key", ""),
                getattr(r, "field_key", ""),
                getattr(r, "description", ""),
                getattr(r, "severity", ""),
                getattr(r, "rule_type", ""),
                getattr(r, "expected_value", "") or "",
                "true" if getattr(r, "enabled", True) else "false",
            ])

        return output.getvalue()

    @classmethod
    def export_version_json(cls, checklist: Any, version: Any, rules: List[Any]) -> str:
        """
        Exports checklist metadata, version, and rules to formatted JSON string.
        """
        data = {
            "name": getattr(checklist, "name", ""),
            "jurisdiction": getattr(checklist, "jurisdiction", ""),
            "source_reference": getattr(checklist, "source_reference", None),
            "description": getattr(checklist, "description", None),
            "version": getattr(version, "version", "v1.0.0"),
            "status": getattr(version, "status", "published"),
            "effective_date": getattr(version, "effective_date", None),
            "changelog_summary": getattr(version, "changelog_summary", None),
            "is_demonstration": getattr(checklist, "is_demonstration", False),
            "rules": [
                {
                    "rule_key": getattr(r, "rule_key", ""),
                    "field_key": getattr(r, "field_key", ""),
                    "description": getattr(r, "description", ""),
                    "severity": getattr(r, "severity", ""),
                    "rule_type": getattr(r, "rule_type", ""),
                    "expected_value": getattr(r, "expected_value", None),
                    "enabled": getattr(r, "enabled", True),
                }
                for r in rules
            ],
        }
        return json.dumps(data, indent=2)
