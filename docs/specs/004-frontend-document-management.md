# Spec 004 - Frontend Document Management

## Objective

Turn the Suivia frontend into an operational console for uploaded documents, batches, review routing and extraction inspection.

## Architecture Decisions

- Frontend code lives in this repository.
- Backend contract is the Python Lambda API from `suivia-mvp`.
- `VITE_API_BASE_URL` is the API entrypoint.
- Browser code must not scan DynamoDB or call AWS services directly.
- S3 uploads must use backend-provided presigned URLs.
- Production deployment remains out of scope until there is a client.

## Product Scope

- Document list with filters for status, document type and text search.
- Upload flow with document type and Textract extraction method.
- Batch upload and batch status view.
- Document detail with structured fields, raw text and JSON.
- Review queue for `LOW_CONFIDENCE` and `NEEDS_REVIEW`.
- Reprocess action with `detect_text`, `analyze_document` or `analyze_expense`.
- JSON export for one document and CSV export for document lists.

## API Contract

The UI consumes these backend paths:

- `POST /documents`
- `POST /documents/process`
- `GET /documents`
- `GET /documents/{document_id}`
- `POST /documents/{document_id}/check-status`
- `POST /documents/{document_id}/reprocess`
- `GET /documents/work-queue`
- `POST /batch`
- `GET /batch`
- `GET /batch/{batch_id}`

The UI must display these statuses distinctly:

- `PENDING_UPLOAD`
- `PROCESSING`
- `COMPLETED`
- `LOW_CONFIDENCE`
- `NEEDS_REVIEW`
- `ERROR`
- `DUPLICATE`

## Validation

Local frontend gate:

```powershell
npm run typecheck
npm run lint
npm run build
npm run test:e2e
```

Backend harness gate:

```powershell
.\scripts\agent_harness.ps1 -Suite frontend -FrontendUrl http://localhost:5173 -ApiBaseUrl https://r6q62ckmo8.execute-api.us-east-1.amazonaws.com/dev
```

Acceptance:

- The first screen exposes document management, not only upload.
- Status/review language is visible on load.
- Textract extraction controls are visible.
- The app loads without direct browser calls to AWS service URLs outside the configured API base URL.
- Build, lint and Playwright smoke pass locally.
