from typing import Optional, List
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Text, Boolean, ForeignKey
from app.models.base import BaseModel


class SeverityLevel:
    CRITICAL = "Critical"
    MAJOR = "Major"
    MINOR = "Minor"

    ALL = {CRITICAL, MAJOR, MINOR}


class RuleType:
    REQUIRED_PRESENCE = "REQUIRED_PRESENCE"
    FORMAT_REGEX = "FORMAT_REGEX"
    VALUE_MATCH = "VALUE_MATCH"
    DATE_EXPIRATION = "DATE_EXPIRATION"
    CROSS_FIELD_MATCH = "CROSS_FIELD_MATCH"

    ALL = {REQUIRED_PRESENCE, FORMAT_REGEX, VALUE_MATCH, DATE_EXPIRATION, CROSS_FIELD_MATCH}


class VersionStatus:
    DRAFT = "draft"
    PUBLISHED = "published"
    DEPRECATED = "deprecated"

    ALL = {DRAFT, PUBLISHED, DEPRECATED}


class Checklist(BaseModel):
    __tablename__ = "checklists"

    name: Mapped[str] = mapped_column(String(160), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    jurisdiction: Mapped[str] = mapped_column(String(80), nullable=False)  # e.g. FDA (US), EU MDR (EU), ISO (Global)
    source_reference: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)  # e.g. 21 CFR 801.20
    is_demonstration: Mapped[bool] = mapped_column(Boolean, default=False)

    versions = relationship(
        "ChecklistVersion",
        back_populates="checklist",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="ChecklistVersion.created_at.desc()",
    )


class ChecklistVersion(BaseModel):
    __tablename__ = "checklist_versions"

    checklist_id: Mapped[str] = mapped_column(String(36), ForeignKey("checklists.id", ondelete="CASCADE"), nullable=False)
    version: Mapped[str] = mapped_column(String(32), nullable=False)  # e.g. v1.0.0
    status: Mapped[str] = mapped_column(String(24), default=VersionStatus.DRAFT)  # draft, published, deprecated
    effective_date: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)  # ISO YYYY-MM-DD
    changelog_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_by: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)

    checklist = relationship("Checklist", back_populates="versions")
    rules = relationship(
        "ChecklistRule",
        back_populates="version",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="ChecklistRule.rule_key.asc()",
    )


class ChecklistRule(BaseModel):
    __tablename__ = "checklist_rules"

    checklist_version_id: Mapped[str] = mapped_column(String(36), ForeignKey("checklist_versions.id", ondelete="CASCADE"), nullable=False)
    rule_key: Mapped[str] = mapped_column(String(80), nullable=False)  # e.g. UDI_DI_REQUIRED
    field_key: Mapped[str] = mapped_column(String(80), nullable=False)  # e.g. udi_di
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[str] = mapped_column(String(24), default=SeverityLevel.MAJOR)  # Critical, Major, Minor
    rule_type: Mapped[str] = mapped_column(String(40), default=RuleType.REQUIRED_PRESENCE)
    expected_value: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    config: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON config
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    version = relationship("ChecklistVersion", back_populates="rules")
