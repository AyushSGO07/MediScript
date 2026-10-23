# MediScript — Product Specification

**Project:** Tata Elxsi Teliport Hackathon — Season 4  
**Case study:** Case Study 4 — Medical Device Labeling Automation  
**Product name:** MediScript  
**Tagline:** Evidence-Backed Medical Device Label Verification and Revision Intelligence  
**Document purpose:** Source of truth for implementing the MediScript prototype.

---

## 1. Product vision

MediScript is a human-in-the-loop medical-device label verification and revision-intelligence application. It helps reviewers ingest approved and revised label PDFs, extract structured label information, verify the extracted information against a version-controlled requirements checklist, identify changes between label revisions, and produce evidence-linked findings and an auditable review report.

The prototype addresses manual, fragmented label verification. Medical-device label variants can span multiple markets and product SKUs. Manually copying parameters between ERP, PLM, and labeling systems can create transcription errors and version drift. Repeated manual verification of identifiers, UDI, symbols, and dates is labor-intensive, while side-by-side comparison can miss altered contraindications, expired symbols, or omitted warnings.

**MediScript is a review copilot, not an autonomous compliance decision-maker.** It assists authorized reviewers. A human reviewer remains responsible for accepting, resolving, rejecting, or escalating findings.

## 2. Core operating principles

1. **Evidence first:** Each finding must cite the source document, page, and supporting text snippet when available. Never fabricate evidence.
2. **Deterministic verification:** Mandatory checklist checks and document diffs must be implemented with explicit rules and deterministic algorithms, not generated solely by an LLM.
3. **Human in the loop:** AI-generated extraction and summaries are suggestions until reviewed. Users record explicit decisions.
4. **Traceability:** Preserve document versions, checklist versions, rule outcomes, reviewer decisions, timestamps, and activity history.
5. **Cautious ambiguity handling:** Missing, unreadable, conflicting, or low-confidence data must be marked as uncertain and routed for review rather than silently guessed.
6. **Prototype honesty:** Do not claim regulatory certification, legal compliance, “100% accuracy,” or production QMS / 21 CFR Part 11 readiness. The prototype demonstrates audit-oriented workflow concepts only.
7. **Privacy by design:** Treat uploaded labeling documents as potentially confidential. Do not send document contents to external model providers unless the user explicitly configures and enables that integration.
8. **Graceful fallback:** The application must support the main workflow without an LLM API key, using deterministic extraction and rule-based behavior wherever possible.

## 3. Target users

- **Labeling / regulatory reviewer:** Reviews extracted fields, checklist results, revision changes, and evidence.
- **Quality or regulatory lead:** Manages checklist versions, reviews high-priority findings, and inspects reports.
- **Workspace administrator / demo operator:** Manages projects, users or demo identities, configuration, and sample data.

For the hackathon prototype, authentication may be a simple local/demo sign-in or configurable single-user mode. Clearly document any authentication limitations.

## 4. End-to-end workflow

### Stage 01 — Extract: Document and field intelligence

1. Create or open a project/review.
2. Upload an approved baseline label PDF and a revised label PDF. Allow a checklist file in CSV or JSON format.
3. Validate file types and size; compute a SHA-256 hash for each uploaded file.
4. Extract text with PyMuPDF, preserving page numbers and text-block bounding boxes where possible.
5. Identify structured label entities, including:
   - UDI / DI / PI
   - REF / LOT
   - Manufacturer
   - Expiration date
   - CE mark
   - Warning statements
   - Contraindications and precautions
   - Symbols and other checklist-configured fields
6. Display extracted text and source page references. Allow users to inspect and correct extracted values.
7. Store extraction provenance, confidence or uncertainty indicators, and user corrections.

The application must distinguish “not found,” “not readable,” “ambiguous,” and “extracted” rather than treating them as the same condition. OCR may be a later enhancement; if the PDF has no usable text layer, show an explicit limitation and a clear “OCR unavailable / required” state rather than inventing content.

### Stage 02 — Verify: Checklist rules and revision diff

1. Select a versioned checklist appropriate to the review.
2. Evaluate extracted fields against mandatory and optional requirements using a deterministic rule engine.
3. Identify missing required fields, invalid date formats, outdated or absent symbols, field mismatches, and configured rule violations.
4. Compare approved and revised label text using a deterministic diff algorithm.
5. Classify changes as added, deleted, modified, or unchanged. Preserve page references where possible.
6. Map findings to checklist rule IDs and source evidence.
7. Show severity / priority and explain why a finding was raised.
8. Allow a reviewer to open the exact supporting page/snippet and inspect the original text.

The prototype may include demo rules inspired by the submission concept (for example, FDA 21 CFR 801/830, EU MDR, and ISO 20417) only as **configurable demonstration references**. Do not hard-code legal interpretations as definitive advice or represent demo rules as a complete, authoritative regulatory checklist. Users must be able to inspect the rule text, source, version, and effective date.

### Stage 03 — Review and Trace: Human decisions and audit export

1. Present findings in a review queue with severity, category, status, evidence, and rule reference.
2. Support reviewer decisions:
   - Accepted
   - Resolved
   - Under Investigation
3. Permit an optional reviewer note; require a note for configurable critical findings or overrides.
4. Record who made the decision, when, the prior state, the new state, and the related finding.
5. Preserve an append-only activity history at the application level. If the storage implementation cannot guarantee tamper evidence, call it an audit log and do not claim it is cryptographically tamper-proof.
6. Generate a downloadable PDF audit report and machine-readable JSON report containing the review metadata, document hashes, checklist version, findings, evidence references, reviewer decisions, timestamps, and sign-off fields.
7. Show a final review summary with unresolved findings clearly visible.

## 5. Functional requirements

### 5.1 Workspace shell and navigation

Build a polished, dark, Figma-inspired workspace interface. It may borrow general interaction patterns such as a persistent sidebar, recent files, project cards, and a central work area, but must not copy Figma branding or assets.

Required navigation:
- Overview
- Projects
- Label Reviews
- Documents
- Requirements
- Reports
- Activity
- Settings

Required shell elements:
- Product wordmark: **MediScript**
- Workspace switcher or workspace label
- Global search UI (search projects, reviews, documents, and findings within available local data)
- Left sidebar with active navigation state
- Main content region
- Recent and starred reviews/documents where appropriate
- User/demo identity menu
- Empty, loading, success, warning, and error states
- Responsive sidebar behavior for smaller screens

Visual direction:
- Dark charcoal / slate background
- Clear neutral surfaces with restrained teal or cyan accents
- Strong typography hierarchy, compact but readable data-dense layouts
- Subtle borders and hover/focus states
- Accessible contrast and keyboard focus indicators
- Consistent iconography (e.g., Lucide)
- Avoid excessive gradients, decorative animations, or dashboard filler metrics that are not based on actual app data

### 5.2 Overview dashboard

Show real application state, not invented metrics:
- Create Review primary action
- Recent reviews
- Draft / in-progress / completed review counts derived from stored data
- Recent activity
- Findings requiring attention
- Projects and document shortcuts
- First-run empty state with a clear path to create a project and upload labels

### 5.3 Projects

- Create, rename, open, and archive projects.
- Each project contains label reviews and related documents.
- Show project name, description, last activity, and review status.
- Confirm destructive actions and prevent accidental deletion.
- Seed a clearly labelled synthetic demo project.

### 5.4 Label review workspace

Create a focused, three-part review layout on desktop:
1. **Document/navigation panel:** baseline and revised document list, page navigation, checklist navigation, findings list.
2. **Document/evidence viewer:** extracted text or PDF preview, page number, highlighted snippet when feasible, bounding boxes where available.
3. **Findings panel:** rule, status, severity, explanation, evidence, and reviewer actions.

On tablet/mobile, panels may stack or become switchable tabs/drawers. Preserve core actions and evidence context.

### 5.5 Documents and extraction

- PDF upload for baseline and revised label.
- CSV/JSON checklist upload, with schema validation and an example template.
- Validate extension and MIME type; enforce configurable upload limits.
- Store document name, version role, hash, upload time, extracted text, page-level text blocks, and extraction status.
- Keep page numbering consistent and visibly state whether page references are zero-based internally or one-based in the UI (UI must use human-readable one-based numbering).
- Provide text search within a document.
- If the PDF is encrypted, corrupt, or has no extractable text, show an actionable error state.
- Do not silently overwrite a document version.

### 5.6 Versioned requirements checklist

A checklist contains:
- Checklist ID and name
- Version
- Jurisdiction / market (free text or configured value)
- Source / reference
- Effective date (optional)
- Rule ID
- Field or topic
- Rule description
- Severity / priority
- Requirement type (required field, value format, presence, match, symbol, date, or custom)
- Expected value / expression where relevant
- Enabled state

Requirements must be versioned. A review should record the exact checklist version used. Editing a checklist creates a new version or explicit revision; it must not silently change historical results.

### 5.7 Rule engine and findings

Each finding should include:
- Stable finding ID
- Review ID
- Rule ID and checklist version
- Category
- Severity: Critical, Major, Minor (configurable)
- Status: Open, Accepted, Resolved, Under Investigation
- Concise explanation
- Expected value / observed value, when applicable
- Source document and page
- Evidence snippet and bounding box, if available
- Baseline/revised side where relevant
- Creation time
- Reviewer decision and note history

Rule engine behavior:
- Deterministic and unit-tested.
- Missing values are not equivalent to compliant values.
- Invalid or ambiguous values are explicitly represented.
- Rule evaluation results should be reproducible for the same inputs and checklist version.
- LLM output must never directly override a deterministic rule outcome without a logged human action.

### 5.8 Revision diff

- Compare extracted text at minimum; compare page/block-level text where practical.
- Present additions, deletions, and modifications in a readable, navigable view.
- Preserve the original and revised text for every diff item.
- Link changes to pages/snippets on each side when possible.
- Group or filter by page, category, severity, or finding status.
- Clearly separate a raw text change from a confirmed compliance issue. A change is not automatically a violation.
- Allow reviewers to flag a change for investigation and link it to a checklist rule.

### 5.9 Reviewer decisions and activity

- Support Accept, Resolve, and Under Investigation.
- Capture optional comments and require comments for configurable critical decisions.
- Display the latest decision and decision history.
- Record activity events for uploads, extraction, checklist changes, rule evaluation, diff generation, finding decisions, report generation, and key project changes.
- Use server-side timestamps and stable IDs.
- For the prototype, document that application-level event history is not a certified electronic signature or validated regulatory audit trail.

### 5.10 Reports

PDF and JSON exports should include:
- MediScript name and report creation timestamp
- Project and review identifiers
- Baseline and revised document names and SHA-256 hashes
- Checklist name and version
- Extraction limitations and uncertainty warnings
- Summary counts by status/severity
- Findings with rule IDs, explanations, observed/expected values, page references, and evidence snippets
- Revision changes
- Reviewer decisions and notes
- Unresolved items and limitations
- Reviewer / sign-off fields (not fabricated)

Use ReportLab for PDF generation. JSON export must be structured and machine-readable. Do not claim a PDF is legally tamper-proof unless cryptographic signing and verification are actually implemented.

## 6. GenAI and bounded Agentic AI

AI is an assistance layer around deterministic processing. The application must remain useful if the LLM integration is not configured.

### 6.1 Suggested assistants / agents

1. **Extraction Assistant**
   - Input: extracted text blocks with page references.
   - Output: schema-constrained candidate field values, source snippets, and uncertainty notes.
   - Must not invent missing values; use null / unknown when evidence is absent.
   - Every extracted candidate must point to its evidence.

2. **Revision Analysis Assistant**
   - Input: deterministic diff items and associated page text.
   - Output: concise plain-language summary of what changed and why a reviewer may want to inspect it.
   - Must distinguish observed changes from inferred impact.
   - Cannot declare a change compliant or non-compliant without the applicable deterministic rule/evidence.

3. **Requirements Review Assistant**
   - Input: checklist rules, extracted values, deterministic rule results, and cited evidence.
   - Output: reviewer-oriented explanation, possible ambiguity, and suggested next step.
   - Must not rewrite or silently reinterpret the checklist.

4. **Finding Quality Checker**
   - Input: proposed finding, rule, and evidence.
   - Output: checks whether the explanation is supported by the cited evidence; flag unsupported or mismatched claims.
   - Must never delete or downgrade a deterministic finding automatically.

5. **Grounded Review Chat**
   - Answer questions about the current review using only retrieved documents, rule definitions, diff items, and findings.
   - Show supporting sources/page references with answers.
   - If evidence is insufficient, say so and ask the reviewer to inspect the source or provide more information.

6. **Workflow Orchestrator**
   - Coordinates extraction assistance, deterministic checks, diff analysis, and report preparation as a bounded workflow.
   - Uses explicit typed inputs/outputs and logs task status.
   - No autonomous external actions, document submissions, or final compliance sign-off.

### 6.2 AI technical requirements

- Use structured output schemas and validate responses before saving.
- Keep deterministic rule results separate from model-generated commentary.
- Pass only the minimum necessary text to the model.
- Make provider/model configuration explicit through environment variables.
- Never place API keys in frontend code or commit them to the repository.
- Handle rate limits, timeouts, malformed outputs, and unavailable providers.
- Show when a summary or candidate field is AI-generated.
- Log provider/model metadata when configured, but avoid logging full confidential document content by default.
- Include a “Retry AI assistance” action when appropriate.
- Provide a deterministic no-key fallback.
- Keep prompts, schemas, and agent boundaries documented and testable.

### 6.3 RAG approach

For the prototype, retrieve only from the current review’s extracted page text, checklist rules, findings, and diff records. Chunk with source metadata such as document ID, page number, text-block ID, and version role. Every answer should include source references. Do not answer review-specific questions from general model knowledge when the answer requires document evidence.

## 7. Technical architecture

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui or equivalent accessible component primitives
- Lucide icons
- Responsive layouts and reusable components
- Typed API client and clear loading/error handling

### Backend
- Python
- FastAPI
- Pydantic request/response models
- PyMuPDF (`fitz`) for PDF text extraction and coordinates
- Python `difflib` or a dedicated deterministic diff layer
- Explicit rule-engine module
- ReportLab for PDF reports
- SQLite for local prototype persistence, with migrations or a clearly documented schema
- Optional LLM provider integration behind a service interface

### Suggested project structure

```text
mediscript/
  frontend/
    src/
      app/
      components/
      features/
        dashboard/
        projects/
        reviews/
        documents/
        requirements/
        findings/
        reports/
        activity/
        settings/
      lib/
      types/
  backend/
    app/
      main.py
      api/
      core/
      db/
      models/
      schemas/
      services/
        pdf_extraction.py
        checklist_service.py
        rule_engine.py
        revision_diff.py
        evidence_service.py
        ai_assistance.py
        report_service.py
        audit_service.py
      tests/
  sample_data/
  docs/
  .env.example
  README.md
  specs.md
```

Antigravity may adapt the exact structure to the existing repository, but must preserve clear separation between UI, API, deterministic processing, AI assistance, persistence, and report generation.

## 8. Suggested data entities

- **Workspace:** id, name, created_at
- **Project:** id, workspace_id, name, description, status, created_at, updated_at
- **Document:** id, project_id, review_id, filename, role, sha256, storage_path, upload_status, extraction_status, uploaded_at
- **PageText:** id, document_id, page_number, extracted_text, extraction_metadata
- **TextBlock:** id, document_id, page_number, block_index, text, bbox
- **Checklist:** id, name, jurisdiction, source, created_at
- **ChecklistVersion:** id, checklist_id, version, effective_date, created_at
- **ChecklistRule:** id, checklist_version_id, rule_key, field_key, description, severity, rule_type, config, enabled
- **Review:** id, project_id, baseline_document_id, revised_document_id, checklist_version_id, status, created_at, updated_at
- **ExtractedField:** id, document_id, field_key, value, confidence/uncertainty, evidence_block_id, reviewed_by, reviewed_at
- **DiffItem:** id, review_id, change_type, baseline_text, revised_text, baseline_page, revised_page, metadata
- **Finding:** id, review_id, rule_id, diff_item_id, severity, status, explanation, observed_value, expected_value, evidence_refs, created_at
- **DecisionEvent:** id, finding_id, previous_status, new_status, reviewer, note, timestamp
- **ActivityEvent:** id, workspace_id/project_id/review_id, event_type, actor, timestamp, metadata
- **Report:** id, review_id, format, created_at, file_path, content_hash

Keep IDs stable and relationships explicit. Avoid storing redundant derived values when they can be recomputed reliably.

## 9. API outline

Use REST endpoints with consistent response/error formats. Names can be adapted, but all core operations must be covered.

```text
GET    /api/health
GET    /api/projects
POST   /api/projects
GET    /api/projects/{project_id}
PATCH  /api/projects/{project_id}
POST   /api/projects/{project_id}/reviews
GET    /api/reviews/{review_id}
POST   /api/reviews/{review_id}/documents
GET    /api/documents/{document_id}
GET    /api/documents/{document_id}/pages/{page_number}
POST   /api/reviews/{review_id}/extract
GET    /api/reviews/{review_id}/fields
PATCH  /api/fields/{field_id}
GET    /api/checklists
POST   /api/checklists
POST   /api/checklists/{checklist_id}/versions
POST   /api/reviews/{review_id}/evaluate
GET    /api/reviews/{review_id}/findings
PATCH  /api/findings/{finding_id}/decision
POST   /api/reviews/{review_id}/diff
GET    /api/reviews/{review_id}/diff
POST   /api/reviews/{review_id}/ai/summary
POST   /api/reviews/{review_id}/ai/chat
POST   /api/reviews/{review_id}/reports
GET    /api/reports/{report_id}/download
GET    /api/activity
```

Validate ownership and references on every endpoint. Return actionable validation errors. Never trust client-supplied file paths, actor identities, or hashes without server-side validation.

## 10. Security, privacy, and robustness

- Validate upload type, size, and file parsing outcomes.
- Generate server-side storage names; do not use user filenames as filesystem paths.
- Keep uploaded files outside publicly served static directories.
- Store secrets in environment variables; provide `.env.example` with placeholders only.
- Add safe CORS configuration for the local frontend/backend setup.
- Avoid rendering uploaded PDF text as raw HTML.
- Do not log API keys or confidential document content by default.
- Clearly identify demo/sample content.
- Handle malformed PDFs, empty documents, invalid checklists, duplicate uploads, and failed report generation.
- Do not create fake user accounts, fake regulatory sources, fake evidence, or fake performance statistics.

## 11. Synthetic demo scenario

Create clearly labelled synthetic sample data to demonstrate the workflow:
- Project: “Demo — Peripheral Vascular Stent Label”
- Baseline label: synthetic approved label PDF.
- Revised label: synthetic revised label PDF with a small set of intentional changes.
- Checklist: demo checklist with a handful of transparent rules, including one required-field check, one date/format check, one identifier match, and one warning-presence check.
- Expected demo results: deterministic findings with page/snippet evidence, visible added/deleted/modified text, review decisions, activity events, and PDF/JSON report export.

All synthetic labels, device names, manufacturer details, IDs, and requirements must be marked as fictional demonstration data. Do not imply that they are valid for a real device or constitute a complete regulatory checklist.

## 12. Six implementation phases

Implement one phase at a time. After each phase, run relevant checks and verify the result before continuing.

### Phase 1 — UI and application foundation
- Inspect the repository before changing files.
- Establish the MediScript brand, design tokens, responsive app shell, dark Figma-inspired sidebar, workspace dashboard, navigation, reusable components, routes, empty states, and demo data boundaries.
- Establish the FastAPI backend foundation, health endpoint, configuration, SQLite setup, initial models/schemas, and frontend API client.
- Ensure the app starts locally with documented commands.
- Do not build the entire PDF/AI workflow in Phase 1; create sensible typed placeholders and integration points.

### Phase 2 — PDF upload and extraction
- Implement baseline/revised PDF upload and checklist upload.
- Add validation, hashes, extraction status, PyMuPDF text extraction, page references, block coordinates, and evidence viewer.
- Add clear handling for corrupt, encrypted, image-only, or empty PDFs.
- Test with synthetic sample documents.

### Phase 3 — Requirements and rule engine
- Implement versioned checklists and deterministic rules.
- Create reproducible rule evaluation and evidence-linked findings.
- Add severity, rule details, uncertainty states, and unit tests.
- Store which checklist version each review used.

### Phase 4 — Revision review
- Implement deterministic baseline/revised text diffing and navigable changes.
- Link changes to page references and findings where possible.
- Add reviewer decisions, comments, activity history, and status transitions.
- Distinguish text changes from rule violations.

### Phase 5 — GenAI and Agentic AI
- Add optional structured extraction assistance, revision summaries, requirements review explanations, finding quality checks, and grounded review chat.
- Add bounded orchestration with explicit inputs/outputs and task logs.
- Ensure source citations, uncertainty handling, schema validation, no-key fallback, and tests.
- AI must not replace deterministic checks or final human decisions.

### Phase 6 — Reports and final verification
- Generate PDF and JSON review reports.
- Test the full workflow from project creation through upload, extraction, rule evaluation, diff, review decisions, and export.
- Fix defects, validate errors/empty states, and verify layouts at desktop, tablet, and mobile widths.
- Update README with setup, environment variables, limitations, and demo instructions.
- Run frontend build/lint/tests and backend tests; report actual results, not assumed results.

## 13. Acceptance criteria

The prototype is considered functionally complete when:

1. A user can open MediScript and navigate the full workspace without broken routes.
2. A user can create a project and review.
3. Baseline and revised PDFs can be uploaded and identified by role.
4. Extracted text displays correct one-based page references and source evidence.
5. Checklist versions can be created or selected and are pinned to a review.
6. Deterministic rules create reproducible findings with explanations and evidence references.
7. The baseline/revised diff displays additions, deletions, and modifications.
8. Reviewers can set Accepted, Resolved, or Under Investigation and add notes where required.
9. Activity history records major workflow events.
10. PDF and JSON reports can be generated and downloaded.
11. AI features, when configured, produce schema-validated and evidence-grounded assistance; when unconfigured, the main workflow remains usable.
12. No AI output is presented as definitive regulatory certification.
13. The interface is usable at desktop, tablet, and mobile widths.
14. Setup instructions work from a clean checkout, and test results are recorded accurately.

## 14. Definition of done for every phase

- Requirements for the phase are implemented, not merely mocked, unless explicitly described as a placeholder.
- No unrelated feature regressions.
- Loading, empty, error, and success states are present for user-facing workflows.
- Core logic has appropriate automated tests.
- The application starts using documented commands.
- Phase verification is completed, with remaining gaps listed honestly.
- Update README/spec notes if implementation decisions diverge from this document.

## 15. Engineering Guidelines & Principles

1. Inspect the existing repository and identify its framework, commands, and current state.
2. Read this entire `specs.md` before implementing features.
3. Implement and verify one milestone at a time. Do not skip ahead before the deterministic data model and workflow are established.
4. Reuse existing working code when appropriate; maintain high software engineering standards.
5. Keep UI, PDF extraction, rule engine, revision diff, persistence, and report generation as modular, testable packages.
6. After each milestone, summarize files changed, commands run, and tests passed.
7. Ensure all automated unit and integration tests pass reliably.
8. If a requirement is ambiguous or cannot be implemented in the current environment, record the issue and ask a focused question rather than silently changing product scope.
