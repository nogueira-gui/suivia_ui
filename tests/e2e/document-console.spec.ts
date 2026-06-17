import { expect, test } from '@playwright/test';

const apiBaseUrl = process.env.API_BASE_URL || 'https://r6q62ckmo8.execute-api.us-east-1.amazonaws.com/dev';

test.describe('Suivia document console', () => {
  test('loads operational document management workflows', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });

    await expect(page).toHaveTitle(/suivia|ocr|document/i);
    await expect(page.getByRole('heading', { name: /Suivia Documentos/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Documentos/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Revisao/i })).toBeVisible();
    await expect(page.getByText(/LOW_CONFIDENCE \/ NEEDS_REVIEW/i)).toBeVisible();
    await expect(page.getByText(/PROCESSING/i).first()).toBeVisible();
    await expect(page.getByText(/detect_text|analyze_document|analyze_expense/i).first()).toBeVisible();

    await page.getByRole('button', { name: /Upload/i }).click();
    await expect(page.locator('input[type="file"]')).toBeAttached();
    await expect(page.getByText(/Metodo de extracao Textract/i)).toBeVisible();
  });

  test('keeps browser traffic behind the configured backend API', async ({ page }) => {
    const directAwsCalls: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (/amazonaws\.com/i.test(url) && (!apiBaseUrl || !url.startsWith(apiBaseUrl))) {
        directAwsCalls.push(url);
      }
    });

    await page.goto('/', { waitUntil: 'networkidle' });

    expect(directAwsCalls, `Unexpected direct AWS browser calls: ${directAwsCalls.join(', ')}`).toEqual([]);
  });

  test('opens real batch detail from the batch list', async ({ page }) => {
    await page.route(`${apiBaseUrl}/documents?**`, async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            {
              document_id: 'doc-batch-001',
              status: 'COMPLETED',
              source_s3_key: 'uploads/lote/doc-batch-001.pdf',
              created_at: '2026-06-17T12:00:00Z',
              batch_id: 'batch-001',
            },
          ],
        }),
      });
    });

    await page.route(`${apiBaseUrl}/documents/work-queue?**`, async (route) => {
      await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ items: [] }) });
    });

    await page.route(`${apiBaseUrl}/batch?**`, async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          batches: [
            {
              batch_id: 'batch-001',
              status: 'COMPLETED',
              total_documents: 1,
              completed_documents: 1,
              processing_documents: 0,
              error_documents: 0,
              created_at: '2026-06-17T12:00:00Z',
            },
          ],
        }),
      });
    });

    await page.route(`${apiBaseUrl}/batch/batch-001`, async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          batch_id: 'batch-001',
          status: 'COMPLETED',
          created_at: '2026-06-17T12:00:00Z',
          statistics: {
            total: 1,
            completed: 1,
            low_confidence: 0,
            needs_review: 0,
            processing: 0,
            error: 0,
            pending: 0,
          },
          documents: [
            {
              document_id: 'doc-batch-001',
              status: 'COMPLETED',
              source_s3_key: 'uploads/lote/doc-batch-001.pdf',
              created_at: '2026-06-17T12:00:00Z',
            },
          ],
        }),
      });
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Lotes/i }).click();
    await page.getByRole('button', { name: /batch-001/i }).click();

    await expect(page.getByRole('heading', { name: /Detalhe do lote/i })).toBeVisible();
    await expect(page.getByText('doc-batch-001').first()).toBeVisible();
    await expect(page.getByText('uploads/lote/doc-batch-001.pdf')).toBeVisible();

    await page.getByRole('button', { name: /Abrir/i }).click();
    await expect(page.getByText(/Detalhe do documento/i)).toBeVisible();
    await expect(page.getByText('doc-batch-001').first()).toBeVisible();
  });
});
