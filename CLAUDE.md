# MediScript Developer Reference

## Project
**MediScript** — Human-in-the-loop medical device label verification and revision intelligence application for regulatory reviewers, quality leads, and compliance operators (Tata Elxsi Teliport Hackathon Season 4, Case Study 4).

- **Core Value:** Deterministic, evidence-backed medical device label verification that eliminates transcription errors and revision drift while keeping authorized human reviewers firmly in control.
- **Rules of Engagement:** Evidence-first (every finding cites document, page, and bounding box coordinates). Deterministic core (rules & diffs are evaluated with deterministic code, never solely an LLM). Graceful zero-key fallback. Honest prototype disclaimers.

## Technology Stack
- **Backend:** Python 3.11+, FastAPI, Pydantic v2, PyMuPDF (`fitz`), Python `difflib`, ReportLab, SQLite with WAL
- **Frontend:** React 18+, TypeScript, Vite, Tailwind CSS, shadcn/ui primitives, Lucide icons
- **Architecture:** Monorepo (`backend/` and `frontend/`), REST API, responsive 3-panel review workspace

## Key Conventions
- Normalized bounding box coordinates (`0.0` to `1.0` floats) across PDF pages.
- 4-state uncertainty taxonomy for entity extraction: `EXTRACTED`, `AMBIGUOUS`, `NOT_READABLE`, `NOT_FOUND`.
- Immutable checklist versioning: modifying rules increments version without mutating past reviews.
- Mandatory reviewer notes for `Critical` severity finding decisions.

## Architecture Stages
- **Stage 01 — Extract:** PDF ingestion, SHA-256 fingerprinting, PyMuPDF text & bounding box extraction.
- **Stage 02 — Verify:** Versioned checklist evaluation via deterministic rule engine, word/block revision diff.
- **Stage 03 — Review & Trace:** 3-panel review workspace, human decision capture, append-only activity audit trail, ReportLab PDF and JSON exports.
- **Assistance Layer:** Bounded GenAI extraction and grounded review chat with bracketed citations and full no-key fallback.
