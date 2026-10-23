from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Response, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.services.checklist_service import ChecklistService
from app.services.checklist_parser import ChecklistParserService
from app.schemas.checklist import (
    ChecklistCreate,
    ChecklistResponse,
    ChecklistDetailResponse,
    ChecklistVersionCreate,
    ChecklistVersionResponse,
    ChecklistVersionDetailResponse,
    ChecklistRuleCreate,
    ChecklistRuleUpdate,
    ChecklistRuleResponse,
    CloneVersionRequest,
)
from app.models.checklist import Checklist, ChecklistVersion, VersionStatus

router = APIRouter(prefix="/checklists", tags=["Checklists"])


@router.get("", response_model=List[ChecklistResponse])
async def list_checklists(db: AsyncSession = Depends(get_db)):
    """
    List all checklists with summary statistics and active version indicators.
    """
    return await ChecklistService.get_checklists(db)


@router.post("", response_model=ChecklistDetailResponse, status_code=201)
async def create_checklist(data: ChecklistCreate, db: AsyncSession = Depends(get_db)):
    """
    Create a new checklist container and initial draft version.
    """
    return await ChecklistService.create_checklist(db, data)


@router.get("/template")
async def download_template(format: str = Query("csv", pattern="^(csv|json)$")):
    """
    Download a sample CSV or JSON checklist starter template with demonstration rules.
    """
    if format == "csv":
        content = ChecklistParserService.generate_csv_template()
        return Response(
            content=content,
            media_type="text/csv",
            headers={"Content-Disposition": 'attachment; filename="mediscript_checklist_template.csv"'},
        )
    else:
        content = ChecklistParserService.generate_json_template()
        return Response(
            content=content,
            media_type="application/json",
            headers={"Content-Disposition": 'attachment; filename="mediscript_checklist_template.json"'},
        )


@router.post("/upload", response_model=ChecklistDetailResponse, status_code=201)
async def upload_checklist(
    file: UploadFile = File(...),
    target_checklist_id: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Upload and parse a CSV or JSON checklist file with schema validation and ReDoS safety checks.
    """
    filename = file.filename or "uploaded_checklist"
    content_bytes = await file.read()
    try:
        content_str = content_bytes.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(status_code=400, detail="File must be UTF-8 encoded text.")

    if filename.lower().endswith(".json"):
        checklist_create, rules, errors = ChecklistParserService.parse_json(content_str)
        if errors:
            raise HTTPException(status_code=400, detail={"errors": errors})
        if not checklist_create:
            raise HTTPException(status_code=400, detail="Failed to parse JSON checklist.")

        if target_checklist_id:
            # Add version to existing checklist
            v_create = ChecklistVersionCreate(
                version=checklist_create.initial_version or "v1.1.0",
                changelog_summary="Imported from JSON",
                rules=rules,
            )
            await ChecklistService.create_version(db, target_checklist_id, v_create)
            res = await ChecklistService.get_checklist(db, target_checklist_id)
            if not res:
                raise HTTPException(status_code=404, detail="Target checklist not found")
            return res
        else:
            # Create new checklist
            return await ChecklistService.create_checklist(db, checklist_create)

    elif filename.lower().endswith(".csv"):
        rules, errors = ChecklistParserService.parse_csv(content_str)
        if errors:
            raise HTTPException(status_code=400, detail={"errors": errors})

        if target_checklist_id:
            # Add version to existing checklist
            v_create = ChecklistVersionCreate(
                version="v1.1.0",
                changelog_summary=f"Imported from {filename}",
                rules=rules,
            )
            await ChecklistService.create_version(db, target_checklist_id, v_create)
            res = await ChecklistService.get_checklist(db, target_checklist_id)
            if not res:
                raise HTTPException(status_code=404, detail="Target checklist not found")
            return res
        else:
            # Infer name from filename
            base_name = filename.rsplit(".", 1)[0].replace("_", " ").replace("-", " ").title()
            c_create = ChecklistCreate(
                name=f"{base_name} Checklist",
                jurisdiction="Custom",
                source_reference=filename,
                description=f"Imported from {filename}",
                initial_version="v1.0.0",
                rules=rules,
            )
            return await ChecklistService.create_checklist(db, c_create)
    else:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload a .csv or .json file.",
        )


@router.get("/{checklist_id}", response_model=ChecklistDetailResponse)
async def get_checklist(checklist_id: str, db: AsyncSession = Depends(get_db)):
    """
    Get detailed checklist data including all versions and rule counts.
    """
    res = await ChecklistService.get_checklist(db, checklist_id)
    if not res:
        raise HTTPException(status_code=404, detail="Checklist not found")
    return res


@router.post("/{checklist_id}/versions", response_model=ChecklistVersionDetailResponse, status_code=201)
async def create_checklist_version(
    checklist_id: str,
    data: ChecklistVersionCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new draft version for a checklist, optionally cloning rules from an existing version.
    """
    return await ChecklistService.create_version(db, checklist_id, data)


@router.get("/versions/{version_id}", response_model=ChecklistVersionDetailResponse)
async def get_checklist_version(version_id: str, db: AsyncSession = Depends(get_db)):
    """
    Get version details including child rules and immutability lock status.
    """
    res = await ChecklistService.get_version(db, version_id)
    if not res:
        raise HTTPException(status_code=404, detail="Checklist version not found")
    return res


@router.put("/versions/{version_id}/publish", response_model=ChecklistVersionResponse)
async def publish_checklist_version(version_id: str, db: AsyncSession = Depends(get_db)):
    """
    Publish a version, permanently locking it against in-place rule modifications.
    """
    return await ChecklistService.publish_version(db, version_id)


@router.get("/versions/{version_id}/export")
async def export_checklist_version(
    version_id: str,
    format: str = Query("csv", pattern="^(csv|json)$"),
    db: AsyncSession = Depends(get_db),
):
    """
    Export all rules of a checklist version as CSV or JSON.
    """
    v_res = await db.execute(select(ChecklistVersion).where(ChecklistVersion.id == version_id))
    version = v_res.scalar_one_or_none()
    if not version:
        raise HTTPException(status_code=404, detail="Checklist version not found")

    c_res = await db.execute(select(Checklist).where(Checklist.id == version.checklist_id))
    checklist = c_res.scalar_one_or_none()
    if not checklist:
        raise HTTPException(status_code=404, detail="Checklist not found")

    rules = version.rules or []

    if format == "csv":
        content = ChecklistParserService.export_version_csv(rules)
        filename = f"{checklist.name.replace(' ', '_')}_{version.version}.csv"
        return Response(
            content=content,
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    else:
        content = ChecklistParserService.export_version_json(checklist, version, rules)
        filename = f"{checklist.name.replace(' ', '_')}_{version.version}.json"
        return Response(
            content=content,
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )


@router.post("/versions/{version_id}/rules", response_model=ChecklistRuleResponse, status_code=201)
async def add_rule(
    version_id: str,
    data: ChecklistRuleCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Add a compliance rule to a draft version. Fails if version is locked.
    """
    return await ChecklistService.add_rule(db, version_id, data)


@router.patch("/rules/{rule_id}", response_model=ChecklistRuleResponse)
async def update_rule(
    rule_id: str,
    data: ChecklistRuleUpdate,
    db: AsyncSession = Depends(get_db),
):
    """
    Update a compliance rule in a draft version. Fails if parent version is locked.
    """
    return await ChecklistService.update_rule(db, rule_id, data)


@router.delete("/rules/{rule_id}")
async def delete_rule(rule_id: str, db: AsyncSession = Depends(get_db)):
    """
    Delete a compliance rule in a draft version. Fails if parent version is locked.
    """
    await ChecklistService.delete_rule(db, rule_id)
    return {"status": "ok", "message": "Rule deleted successfully"}
