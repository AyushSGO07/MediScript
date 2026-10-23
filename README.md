# MediScript

> **Evidence-Backed Medical Device Label Verification and Revision Intelligence**  
> *Deterministic Compliance Copilot for Regulatory Reviewers, Quality Leads, and Labeling Engineers*

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.2+-61DAFB.svg?style=flat&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2+-3178C6.svg?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4+-38B2AC.svg?style=flat&logo=tailwind-css)](https://tailwindcss.com)
[![PyMuPDF](https://img.shields.io/badge/PyMuPDF-fitz--2.0-red.svg?style=flat)](https://pymupdf.readthedocs.io)
[![SQLite](https://img.shields.io/badge/SQLite-WAL--Mode-003B57.svg?style=flat&logo=sqlite)](https://sqlite.org)

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
                    ┌─────────────────────────────────────────────────────┐
                    │               MediScript Architecture               │
                    └─────────────────────────────────────────────────────┘
                                               │
             ┌─────────────────────────────────┼─────────────────────────────────┐
             │                                 │                                 │
             ▼                                 ▼                                 ▼
   [ Stage 01: Ingest & Extract ]     [ Stage 02: Rule & Diff Engine ]  [ Stage 03: 3-Panel Workspace ]
   • PDF Parsing via PyMuPDF          • Deterministic Rule Engine        • Document Navigation (w-72)
   • SHA-256 Fingerprinting           • Versioned Checklists             • Evidence Canvas (CSS 3D Pan/Zoom)
   • Normalized Bounding Boxes [0..1] • 4-Way Sequence Diff Engine       • Resolution-Independent SVG
   • 4-State Entity Uncertainty       • 1-Click Finding Promotion        • Findings Action Queue (w-96)
   • High-Res PNG Previews            • Zero External LLM Dependency     • Bidirectional Jump Linkage
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
- **Sequence Matching:** Utilizes block-level and word-level sequence matching algorithms.
- **4-Way Change Classification:** Classifies all differences into `ADDED`, `DELETED`, `MODIFIED`, or `UNCHANGED`.
- **Finding Promotion:** Promotes any unapproved text modification into a formal compliance finding with a single click.

### 6. Interactive Three-Panel Review Workspace
- **Layout:**
  - **Left Navigation (`288px`):** Document integrity SHA-256 card, layer visibility toggles (`Findings`, `Entities`, `Diffs`), and vertical page density list.
  - **Center Evidence Canvas (`flex-1`):** Hardware-accelerated CSS 3D translation (`translate3d`, `scale`) for smooth 60 FPS pan and zoom (0.5x–3.0x), high-res PNG canvas, and side-by-side split comparison mode.
  - **Right Findings Action Queue (`384px`):** Triage queue with severity filter tabs (`Critical`, `Major`, `Minor`, `Diffs`) and search bar.
- **Resolution-Independent SVG Overlays:** 1000x1000 coordinate viewBox overlaying severity-coded bounding boxes, animated pulsating active focus rings, and hover inspection tooltips.
- **In-Document Text Search:** Real-time keyword matching across text blocks with cyan SVG highlights and cycling controls.
- **Bidirectional Viewport Linkage:** Clicking "Jump to Evidence" automatically switches document role, flips to the cited page, and centers the viewport on the non-compliant bounding box midpoint; clicking a canvas box highlights the finding in the queue.

---

## 3. Technology Stack

### Backend
- **Language:** Python 3.11+
- **Framework:** [FastAPI](https://fastapi.tiangolo.com) (Async ASGI)
- **Database:** SQLite 3 with Write-Ahead Logging (`WAL` mode) via [SQLAlchemy](https://www.sqlalchemy.org) & [Alembic](https://alembic.sqlalchemy.org)
- **PDF Extraction & Rendering:** [PyMuPDF](https://pymupdf.readthedocs.io) (`fitz`) 2.0+
- **Sequence Diff:** Pure Python `difflib.SequenceMatcher`
- **Testing:** [pytest](https://docs.pytest.org), `pytest-asyncio`, `httpx`

### Frontend
- **Framework:** [React 18](https://react.dev) with [TypeScript](https://www.typescriptlang.org)
- **Bundler:** [Vite 5](https://vitejs.dev)
- **Styling:** [Tailwind CSS](https://tailwindcss.com) (Figma-inspired Dark Slate design token palette)
- **Icons:** [Lucide React](https://lucide.dev)

---

## 4. Getting Started

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
The backend API and OpenAPI docs will be available at:
- API Root: `http://127.0.0.1:8000/api`
- Interactive Docs: `http://127.0.0.1:8000/docs`

### 3. Frontend Setup
```bash
# Navigate to frontend folder
cd frontend

# Install npm packages
npm install

# Run frontend development server
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 5. Running Automated Tests

MediScript includes comprehensive unit and integration test suites:

```bash
# Run all backend test suites
$env:PYTHONPATH="backend"
backend\.venv\Scripts\python.exe -m pytest backend/tests

# Run frontend production build & type checks
cd frontend
npm run build
```

---

## 6. Regulatory & Compliance Notice

MediScript is an engineering prototype developed for medical device label verification assistance. It is designed to demonstrate automated evidence linking, deterministic checklist evaluation, and revision intelligence. It does not constitute formal legal certification or replace qualified regulatory affairs review under FDA or EU MDR directives.

---

## 7. License

Distributed under the MIT License. See `LICENSE` for more information.
