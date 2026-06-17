# Suivia UI Agent Context

## Mission

This repository is the frontend source for Suivia. The backend target is the Python Lambda API in `suivia-mvp`; Java is only a behavior reference in the backend repo.

## Architecture Rules

- Treat this app as an operational document console, not a marketing page and not an upload-only prototype.
- Use `VITE_API_BASE_URL` as the only backend entrypoint.
- Do not call AWS service APIs directly from browser code. S3 access is allowed only through presigned URLs returned by the backend.
- Keep frontend releases independent from backend releases when API contracts are compatible.
- Do not apply or deploy production infrastructure until there is an explicit client-driven production decision.

## Required Workflows

The first screen must keep document management visible:

- document list with status, type and search filters;
- upload and batch upload;
- detail view with extracted fields, raw text and JSON;
- human review queue for `LOW_CONFIDENCE` and `NEEDS_REVIEW`;
- reprocess action with `detect_text`, `analyze_document` and `analyze_expense`;
- export paths for JSON and CSV.

## Validation

Run local validation from this repo:

```powershell
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

Run cross-repo validation from the backend repo after starting the frontend dev server:

```powershell
.\scripts\agent_harness.ps1 -Suite frontend -FrontendUrl http://localhost:5173 -ApiBaseUrl https://r6q62ckmo8.execute-api.us-east-1.amazonaws.com/dev
```

Use Playwright/browser tooling for exploratory debugging and screenshots, then keep the repeatable Playwright suites as the gate.
