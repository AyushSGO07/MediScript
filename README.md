# MediScript

> **Evidence-Backed Medical Device Label Verification and Revision Intelligence**  
> *Deterministic Compliance Copilot for Regulatory Reviewers, Quality Leads, and Labeling Engineers*

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.2+-61DAFB.svg?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2+-3178C6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4+-38B2AC.svg?style=flat&logo=tailwind-css)](https://tailwindcss.com)
[![PyMuPDF](https://img.shields.io/badge/PyMuPDF-fitz--2.0-red.svg?style=flat)](https://pymupdf.readthedocs.io)
[![SQLite](https://img.shields.io/badge/SQLite-WAL--Mode-003B57.svg?style=flat&logo=sqlite)](https://sqlite.org)
[![Pytest](https://img.shields.io/badge/Pytest-77%20Passed-brightgreen.svg?style=flat&logo=pytest)](https://pytest.org)

---

## 1. Overview & Vision

Medical device packaging and labeling variants span numerous target markets, languages, and product SKUs. Manually cross-referencing parameters between ERP, PLM, and regulatory labeling systems creates critical risks of transcription errors, missed contraindications, omitted warnings, or revision drift across product lifecycle updates.

**MediScript** is a human-in-the-loop desktop web application designed to accelerate and harden regulatory label review. It ingests approved baseline and revised label PDFs, extracts structured medical entities with normalized visual coordinates, deterministically verifies them against versioned regulatory checklists (such as **FDA 21 CFR 801/830** and **EU MDR 2017/745 Annex I**), generates color-coded visual diffs, and provides an interactive three-panel review workstation.

> [!IMPORTANT]
> **Regulatory Stance: Assistive Review Copilot**  
> MediScript is designed as an assistive tool, not an autonomous certification authority. An authorized human reviewer remains firmly in control of all triage decisions, override approvals, and formal audit sign-offs.

---

## 2. Core Features & Architecture

```
                    ┌─────────────────────────────────────────────────────────────────┐
                    │                    MediScript Architecture                      │
                    └─────────────────────────────────────────────────────────────────┘
                                                       │
         ┌───────────────────────────────┬─────────────┴─────────────────┬───────────────────────────────┐
         │                               │                               │                               │
         ▼                               ▼                               ▼                               ▼
[ Stage 01: Ingestion ]       [ Stage 02: Verification ]     [ Stage 03: 3-Panel Review ]     [ Stage 04: Audit & Export ]
• PyMuPDF text & coords       • Deterministic Rule Engine    • Document Nav & SHA-256 cards   • Formal ReportLab PDF Dossier
• SHA-256 Fingerprinting      • Versioned Checklists         • CSS 3D Hardware Pan/Zoom       • Machine-Readable JSON Export
• 4-State Entity Taxonomy     • 4-Way Sequence Diff Engine   • Resolution-Independent SVG     • Complete Append-Only Audit Trail
• High-res 150/200 DPI PNG    • 1-Click Diff Promotion       • Triage Queue & Search Filter   • Grounded AI Review Copilot
• Normalized BBoxes [0..1]    • Zero LLM Hallucination       • Bidirectional Viewport Jump    • Finding Decision History
```

### 1. Document Ingestion & PyMuPDF Extraction
- **Cryptographic Integrity:** Automatic SHA-256 fingerprinting on upload to guarantee document tamper evidence.
- **Coordinate Extraction:** Extracts text blocks, lines, character spans, and bounding box coordinates normalized to `0.0–1.0` floats across physical PDF pages.
- **High-Resolution Previews:** On-demand disk-cached 150/200 DPI PNG preview rendering.
- **Scanned / Raster PDF Warning:** Flags PDFs lacking a native digital text layer.

### 2. Structured Medical Entity Extraction
- Extracts critical device label fields:
  - **Identifiers:** Unique Device Identification (`UDI`), Catalog/Reference Number (`REF`), Batch/Lot (`LOT`).
  - **Dates:** Expiration Date (`EXP`), Manufacturing Date (`MFG`) with ISO 8601 validation.
  - **Manufacturer:** Legal entity name, address, and facility codes.
  - **Regulatory & Safety:** CE Mark + Notified Body (`CE 0123`), Sterile status, Single-Use symbols, Rx-Only designations, and Storage conditions.
- **4-State Uncertainty Taxonomy:** Each field is explicitly classified into `EXTRACTED`, `AMBIGUOUS`, `NOT_READABLE`, or `NOT_FOUND` to prevent hallucination.
- **Manual Reviewer Overrides:** Full audit logging when a reviewer corrects or overrides an extracted field.

### 3. Versioned Requirements Checklist System
- **Immutable Checklists:** Version-pinned regulatory rules. Changes trigger new minor/major versions without mutating past historical reviews.
- **Pre-Seeded Standards:** Ships with pre-configured demonstration checklists for FDA 21 CFR 801/830 and EU MDR 2017/745.
- **CSV & JSON Import/Export:** Import standardized templates or export checklists with one click.

### 4. Deterministic Compliance Rule Engine
- **Zero Cloud / LLM Dependency:** Evaluation is 100% offline, deterministic, and repeatable.
- **Rule Operators:**
  - `REQUIRED_PRESENCE`: Ensures essential fields exist and are readable.
  - `FORMAT_REGEX`: Validates strict syntactic patterns (e.g., UDI-DI formats).
  - `VALUE_MATCH`: Asserts exact string matches.
  - `DATE_EXPIRATION`: Compares expiration dates against evaluation thresholds.
  - `CROSS_FIELD_MATCH`: Verifies consistency between baseline and revised versions.
- **Coordinate-Linked Findings:** Every finding is linked to its source document role, page number, text context snippet, and normalized visual coordinates.

### 5. Deterministic Revision Diff Engine
- **Sequence Matching:** Utilizes block-level and word-level sequence matching algorithms (`difflib.SequenceMatcher`).
- **4-Way Change Classification:** Classifies all differences into `ADDED`, `DELETED`, `MODIFIED`, or `UNCHANGED`.
- **Finding Promotion:** Promotes any unapproved text modification into a formal compliance finding with customized severity.

### 6. Interactive Three-Panel Review Workspace
- **Layout:**
  - **Left Navigation (`288px`):** Document integrity SHA-256 card, layer visibility toggles (`Findings`, `Entities`, `Diffs`), and vertical page density list.
  - **Center Evidence Canvas (`flex-1`):** Hardware-accelerated CSS 3D translation (`translate3d`, `scale`) for smooth 60 FPS pan and zoom (0.5x–3.0x), high-res PNG canvas, and side-by-side split comparison mode.
  - **Right Findings Action Queue (`384px`):** Triage queue with severity filter tabs (`Critical`, `Major`, `Minor`, `Diffs`) and search bar.
- **Resolution-Independent SVG Overlays:** 1000x1000 coordinate viewBox overlaying severity-coded bounding boxes, animated pulsating active focus rings, and hover inspection tooltips.
- **In-Document Text Search:** Real-time keyword matching across text blocks with cyan SVG highlights and cycling controls.
- **Bidirectional Viewport Linkage:** Clicking "Jump to Evidence" automatically switches document role, flips to the cited page, and centers the viewport on the non-compliant bounding box midpoint; clicking a canvas box highlights the finding in the queue.

### 7. Human-in-the-Loop Decision Lifecycle & Workflow
- **Explicit Reviewer Decisions:** Transition findings between `OPEN`, `RESOLVED`, `ACCEPTED`, `OVERRIDDEN`, `WAIVED`, and `ESCALATED`.
- **Enforced Compliance Governance:** Mandatory reviewer justification note (minimum 5 characters) strictly required for all `CRITICAL` findings.
- **Decision History Drawer:** Complete chronological log per finding showing actor, role, prior status, new status, justification notes, and timestamps.

### 8. Multi-Format Regulatory Reports & Audit Dossiers
- **Formal PDF Export:** ReportLab-powered PDF dossier generator with executive summaries, findings breakdown, visual severity metrics, and reviewer sign-off declaration block.
- **Machine-Readable JSON Package:** Comprehensive JSON export schema adhering to regulatory audit exchange specifications.
- **Reports Dashboard (`/reports`):** In-app overview with per-review compliance ratings, severity distribution charts, and quick-download triggers.

### 9. Append-Only Activity Audit Trail
- **Immutable Event Logging:** Records all system and reviewer actions (`DOCUMENT_UPLOADED`, `ENTITY_OVERRIDDEN`, `CHECKLIST_EVALUATED`, `FINDING_DECISION_RECORDED`, `DIFF_PROMOTED`, etc.).
- **Audit Explorer (`/activity`):** Interactive timeline with filtering by entity type, actor, severity, and date range, plus full JSON event detail inspection and CSV export.

### 10. Grounded AI Review Copilot & Assistance
- **Strict Evidence Grounding:** AI chat copilot answers reviewer questions using only the active review's extracted text, bounding boxes, and checklist rules to eliminate hallucination.
- **Interactive Citation Jumping:** Chat responses cite exact document pages and coordinates; clicking a citation immediately focuses the evidence viewer on the source text.
- **AI Remediation Suggestions:** Per-finding AI assistance suggesting regulatory rationale, remediation steps, and standard citations.

### 11. One-Click Synthetic Demo Showcase
- **Instant Demonstration:** Pre-configured demo scenarios (CardioVasc™ Everolimus-Eluting Stent System) pre-loaded with subtle EU MDR and FDA labeling defects (UDI format mismatch, shifted expiry date, omitted sterile symbol).
- **One-Click Runner:** Quickly initialize, evaluate, and inspect complete reviews without manually uploading files.

---

## 3. Technology Stack

### Backend
- **Language:** Python 3.11+
- **Framework:** [FastAPI](https://fastapi.tiangolo.com) (Async ASGI)
- **Database:** SQLite 3 with Write-Ahead Logging (`WAL` mode) via [SQLAlchemy](https://www.sqlalchemy.org) & [aiosqlite](https://github.com/omnilib/aiosqlite)
- **PDF Extraction & Rendering:** [PyMuPDF](https://pymupdf.readthedocs.io) (`fitz`) 2.0+
- **Dossier & Report Generation:** [ReportLab](https://www.reportlab.com/)
- **Sequence Diff:** Pure Python `difflib.SequenceMatcher`
- **Testing:** [pytest](https://docs.pytest.org), `pytest-asyncio`, `httpx`

### Frontend
- **Framework:** [React 18](https://react.dev) with [TypeScript](https://www.typescriptlang.org)
- **Bundler:** [Vite 5](https://vitejs.dev)
- **Styling:** [Tailwind CSS](https://tailwindcss.com) (Dark Slate token palette)
- **Icons:** [Lucide React](https://lucide.dev)

---

## 4. API Endpoints Reference

| Prefix | Method & Path | Description |
|---|---|---|
| **Projects** | `GET /api/projects` | List all projects with review counts |
| | `POST /api/projects` | Create a new project workspace |
| **Reviews** | `GET /api/reviews` | List reviews with status filters |
| | `POST /api/reviews` | Create a review linked to baseline and revised PDFs |
| | `GET /api/reviews/{id}` | Get review details, attached documents, and checklist version |
| **Documents** | `POST /api/documents/upload` | Upload label PDF, compute SHA-256 hash, cache page previews |
| | `GET /api/documents/{id}/pages/{page}/preview` | Fetch rendered 150/200 DPI PNG page preview |
| | `GET /api/documents/{id}/blocks` | Get extracted text blocks and normalized bounding boxes |
| **Entities** | `GET /api/documents/{id}/fields` | Fetch extracted structured medical fields with uncertainty status |
| | `PUT /api/fields/{id}/override` | Reviewer override of an extracted entity with audit logging |
| **Checklists** | `GET /api/checklists` | List regulatory checklists (FDA 21 CFR, EU MDR, custom) |
| | `POST /api/checklists/upload` | Import checklist from CSV or JSON schema |
| | `POST /api/checklists/{id}/versions` | Create immutable new checklist revision |
| **Findings** | `POST /api/reviews/{id}/evaluate` | Run deterministic compliance rule engine |
| | `GET /api/reviews/{id}/findings` | Retrieve all findings with coordinate linkages and filter tabs |
| | `POST /api/findings/{id}/decisions` | Record human triage decision (mandatory note for Critical) |
| | `GET /api/findings/{id}/decisions` | Fetch chronological decision history log |
| **Revision Diff** | `POST /api/reviews/{id}/diff` | Execute 4-way sequence revision diff |
| | `POST /api/reviews/{id}/diffs/{diff_id}/promote` | Promote diff item into a formal compliance finding |
| **Reports** | `GET /api/reviews/{id}/reports/summary` | Executive compliance summary & metrics |
| | `GET /api/reviews/{id}/reports/pdf` | Generate and download formal ReportLab audit PDF |
| | `GET /api/reviews/{id}/reports/json` | Export machine-readable JSON compliance package |
| **Audit Activity** | `GET /api/activity` | Query append-only audit trail with entity and actor filters |
| **AI Copilot** | `POST /api/chat/reviews/{id}` | Ask grounded queries citing exact document coordinates |
| | `GET /api/assistance/findings/{id}/remediation` | Retrieve regulatory guidance & remediation suggestion |
| **Demo Showcase** | `POST /api/demo/create-showcase` | Seed synthetic stent label review with intentional defects |

---

## 5. Getting Started

### Prerequisites
- **Python 3.11+**
- **Node.js 18+** & **npm**

### 1. Clone the Repository
```bash
git clone https://github.com/AyushSGO07/MediScript.git
cd MediScript
```

### 2. Backend Setup
```bash
# Create and activate Python virtual environment
python -m venv backend/.venv

# On Windows (PowerShell):
.\backend\.venv\Scripts\Activate.ps1
# On Linux/macOS:
source backend/.venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt

# Run backend development server
# Windows (PowerShell):
$env:PYTHONPATH="backend"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Linux/macOS:
PYTHONPATH=backend python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API and OpenAPI documentation will be available at:
- API Root: `http://127.0.0.1:8000/api`
- Interactive OpenAPI Docs: `http://127.0.0.1:8000/docs`

### 3. Frontend Setup
```bash
# Navigate to frontend folder
cd frontend

# Install dependencies
npm install

# Run frontend development server
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 6. Running Automated Tests

MediScript includes 77 automated test cases spanning 26 test suites covering extraction, diff engine, deterministic rules, decision workflows, audit trails, reports, and AI assistance:

```bash
# Run all backend test suites
cd backend
.\.venv\Scripts\python.exe -m pytest tests

# Run frontend type-check & production build
cd ../frontend
npm run build
```

---

## 7. Regulatory & Compliance Notice

MediScript is an engineering prototype developed for medical device label verification assistance. It is designed to demonstrate automated evidence linking, deterministic checklist evaluation, and revision intelligence. It does not constitute formal legal certification or replace qualified regulatory affairs review under FDA or EU MDR directives.

---

## 8. License

Distributed under the MIT License. See `LICENSE` for more information.
