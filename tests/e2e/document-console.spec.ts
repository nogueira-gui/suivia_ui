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
});
