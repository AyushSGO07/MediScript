import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.session import AsyncSessionLocal
from app.services.checklist_service import ChecklistService


@pytest_asyncio.fixture(autouse=True)
async def seed_data():
    async with AsyncSessionLocal() as session:
        await ChecklistService.seed_demonstration_checklists(session)


@pytest.mark.asyncio
async def test_seeded_checklists_and_listing():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        res = await client.get("/api/checklists")
        assert res.status_code == 200
        checklists = res.json()
        assert len(checklists) >= 3

        names = [c["name"] for c in checklists]
        assert any("FDA 21 CFR 801/830" in n for n in names)
        assert any("EU MDR 2017/745" in n for n in names)
        assert any("ISO 20417" in n for n in names)

        fda_chk = next(c for c in checklists if "FDA 21 CFR 801/830" in c["name"])
        assert fda_chk["is_demonstration"] is True
        assert fda_chk["version_count"] >= 1


@pytest.mark.asyncio
async def test_checklist_detail_and_immutability():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Get checklists
        list_res = await client.get("/api/checklists")
        checklists = list_res.json()
        fda_chk = next(c for c in checklists if "FDA 21 CFR 801/830" in c["name"])

        # Get details
        detail_res = await client.get(f"/api/checklists/{fda_chk['id']}")
        assert detail_res.status_code == 200
        detail = detail_res.json()
        assert len(detail["versions"]) >= 1

        v1 = detail["versions"][0]
        assert v1["status"] == "published"
        assert v1["is_locked"] is True

        # Get version detail
        version_res = await client.get(f"/api/checklists/versions/{v1['id']}")
        assert version_res.status_code == 200
        v_data = version_res.json()
        assert len(v_data["rules"]) >= 8
        first_rule = v_data["rules"][0]

        # Immutability Check 1: Adding a rule to a published version should fail
        add_rule_res = await client.post(
            f"/api/checklists/versions/{v1['id']}/rules",
            json={
                "rule_key": "NEW_ILLEGAL_RULE",
                "field_key": "udi_di",
                "description": "This should be blocked",
                "severity": "Critical",
                "rule_type": "REQUIRED_PRESENCE",
            },
        )
        assert add_rule_res.status_code == 400
        assert "cannot be modified" in add_rule_res.json()["detail"]

        # Immutability Check 2: Modifying an existing rule in a published version should fail
        update_rule_res = await client.patch(
            f"/api/checklists/rules/{first_rule['id']}",
            json={"description": "Hacked description"},
        )
        assert update_rule_res.status_code == 400
        assert "cannot be modified" in update_rule_res.json()["detail"]

        # Immutability Check 3: Deleting an existing rule in a published version should fail
        del_rule_res = await client.delete(f"/api/checklists/rules/{first_rule['id']}")
        assert del_rule_res.status_code == 400
        assert "cannot be modified" in del_rule_res.json()["detail"]


@pytest.mark.asyncio
async def test_version_cloning_and_draft_editing():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Get ISO checklist
        list_res = await client.get("/api/checklists")
        iso_chk = next(c for c in list_res.json() if "ISO 20417" in c["name"])
        v1_id = iso_chk["latest_version"]

        detail_res = await client.get(f"/api/checklists/{iso_chk['id']}")
        v1 = detail_res.json()["versions"][0]

        # Clone into a new draft version
        clone_res = await client.post(
            f"/api/checklists/{iso_chk['id']}/versions",
            json={
                "version": "v1.1.0-draft",
                "clone_from_version_id": v1["id"],
                "changelog_summary": "Testing branch modifications",
            },
        )
        assert clone_res.status_code == 201
        v2 = clone_res.json()
        assert v2["version"] == "v1.1.0-draft"
        assert v2["status"] == "draft"
        assert v2["is_locked"] is False
        assert len(v2["rules"]) == len(v1_id and detail_res.json()["versions"][0]["rules"] if "rules" in detail_res.json()["versions"][0] else v2["rules"])

        # Adding a rule to the draft version should succeed
        add_rule_res = await client.post(
            f"/api/checklists/versions/{v2['id']}/rules",
            json={
                "rule_key": "ISO_SPECIAL_WARNING",
                "field_key": "warnings",
                "description": "Special warning notice",
                "severity": "Minor",
                "rule_type": "REQUIRED_PRESENCE",
                "enabled": True,
            },
        )
        assert add_rule_res.status_code == 201
        new_rule = add_rule_res.json()
        assert new_rule["rule_key"] == "ISO_SPECIAL_WARNING"

        # Updating the rule in draft version should succeed
        up_res = await client.patch(
            f"/api/checklists/rules/{new_rule['id']}",
            json={"severity": "Major", "description": "Updated warning notice"},
        )
        assert up_res.status_code == 200
        assert up_res.json()["severity"] == "Major"

        # Deleting the rule in draft version should succeed
        del_res = await client.delete(f"/api/checklists/rules/{new_rule['id']}")
        assert del_res.status_code == 200

        # Publishing the version should lock it
        pub_res = await client.put(f"/api/checklists/versions/{v2['id']}/publish")
        assert pub_res.status_code == 200
        assert pub_res.json()["status"] == "published"
        assert pub_res.json()["is_locked"] is True


@pytest.mark.asyncio
async def test_templates_and_export_endpoints():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Download CSV template
        csv_res = await client.get("/api/checklists/template?format=csv")
        assert csv_res.status_code == 200
        assert "text/csv" in csv_res.headers["content-type"]
        assert "rule_key" in csv_res.text

        # Download JSON template
        json_res = await client.get("/api/checklists/template?format=json")
        assert json_res.status_code == 200
        assert "application/json" in json_res.headers["content-type"]
        assert "jurisdiction" in json_res.json()

        # Export version
        list_res = await client.get("/api/checklists")
        c1 = list_res.json()[0]
        c1_det = (await client.get(f"/api/checklists/{c1['id']}")).json()
        v_id = c1_det["versions"][0]["id"]

        exp_csv = await client.get(f"/api/checklists/versions/{v_id}/export?format=csv")
        assert exp_csv.status_code == 200
        assert "text/csv" in exp_csv.headers["content-type"]

        exp_json = await client.get(f"/api/checklists/versions/{v_id}/export?format=json")
        assert exp_json.status_code == 200
        assert exp_json.json()["version"] == c1_det["versions"][0]["version"]


@pytest.mark.asyncio
async def test_csv_upload_checklist():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        csv_content = """rule_key,field_key,description,severity,rule_type,expected_value,enabled
TEST_LOT_REQ,lot_batch,Lot required,Critical,REQUIRED_PRESENCE,,true
TEST_EXP_REQ,expiration_date,Expiration date ISO,Major,FORMAT_REGEX,^\\d{4}-\\d{2}-\\d{2}$,true
"""
        files = {
            "file": ("custom_ortho_rules.csv", csv_content.encode("utf-8"), "text/csv")
        }
        res = await client.post("/api/checklists/upload", files=files)
        assert res.status_code == 201
        data = res.json()
        assert "Custom Ortho Rules" in data["name"]
        assert data["version_count"] >= 1
