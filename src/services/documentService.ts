import type {
  DocumentFilters,
  DocumentListResponse,
  DocumentResult,
  ProcessResponse,
  UploadUrlResponse,
  WorkQueueResponse,
} from '../types/document';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://r6q62ckmo8.execute-api.us-east-1.amazonaws.com/dev';
const API_KEY = import.meta.env.VITE_API_KEY || '';

function getHeaders(includeContentType = true): HeadersInit {
  const headers: HeadersInit = {};

  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }

  if (API_KEY) {
    headers['x-api-key'] = API_KEY;
  }

  return headers;
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  });

  const queryString = query.toString();
  return queryString ? `?${queryString}` : '';
}

async function readJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`${fallbackMessage}: ${response.status} ${response.statusText}${text ? ` - ${text}` : ''}`);
  }

  return response.json() as Promise<T>;
}

export class DocumentService {
  private static getContentType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'application/pdf';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      default:
        return 'application/octet-stream';
    }
  }

  static async requestUploadUrl(
    filename: string,
    extractionMethod?: string,
    documentType?: string
  ): Promise<UploadUrlResponse> {
    const body: Record<string, unknown> = {
      filename,
      content_type: this.getContentType(filename),
    };

    if (documentType) {
      body.document_type = documentType;
    }

    if (extractionMethod) {
      body.extraction_method = extractionMethod;
    }

    const response = await fetch(`${API_BASE_URL}/documents`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    return readJson<UploadUrlResponse>(response, 'Failed to request upload URL');
  }

  static async uploadToS3(uploadUrl: string, file: File, contentType: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', contentType);
      xhr.timeout = 300000;

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Failed to upload file to S3: ${xhr.status} ${xhr.statusText} - ${xhr.responseText}`));
        }
      };

      xhr.onerror = () => reject(new Error(`Network error during S3 upload. Status: ${xhr.status}`));
      xhr.ontimeout = () => reject(new Error('Upload to S3 timed out'));
      xhr.send(file);
    });
  }

  static async processDocument(
    documentId: string,
    useLlm?: boolean,
    forceReprocess?: boolean
  ): Promise<ProcessResponse> {
    const body: Record<string, unknown> = {
      document_id: documentId,
      documentId,
    };

    if (useLlm !== undefined) {
      body.use_llm = useLlm;
    }

    if (forceReprocess !== undefined) {
      body.force_reprocess = forceReprocess;
    }

    const response = await fetch(`${API_BASE_URL}/documents/process`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    return readJson<ProcessResponse>(response, 'Failed to process document');
  }

  static async getDocumentStatus(documentId: string): Promise<DocumentResult> {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      headers: getHeaders(),
    });

    return readJson<DocumentResult>(response, 'Failed to get document status');
  }

  static async listDocuments(filters: DocumentFilters = {}): Promise<DocumentListResponse> {
    const response = await fetch(
      `${API_BASE_URL}/documents${buildQuery({
        tenant_id: filters.tenantId || 'default',
        year_month: filters.yearMonth,
        status: filters.status && filters.status !== 'ALL' ? filters.status : undefined,
        limit: filters.limit || 50,
      })}`,
      { headers: getHeaders() }
    );

    return readJson<DocumentListResponse>(response, 'Failed to list documents');
  }

  static async listWorkQueue(filters: DocumentFilters = {}): Promise<WorkQueueResponse> {
    const response = await fetch(
      `${API_BASE_URL}/documents/work-queue${buildQuery({
        tenant_id: filters.tenantId || 'default',
        status: filters.status && filters.status !== 'ALL' ? filters.status : undefined,
        limit: filters.limit || 50,
      })}`,
      { headers: getHeaders() }
    );

    return readJson<WorkQueueResponse>(response, 'Failed to list review queue');
  }

  static async checkDocumentStatus(documentId: string, jobId?: string): Promise<DocumentResult> {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/check-status`, {
      method: 'POST',
      headers: getHeaders(),
      body: jobId ? JSON.stringify({ job_id: jobId, jobId }) : undefined,
    });

    const data = await readJson<DocumentResult>(response, 'Failed to check document status');
    if (import.meta.env.DEV) {
      console.debug('check-status response:', data);
    }
    return data;
  }

  static async reprocessDocument(documentId: string, extractionMethod?: string): Promise<ProcessResponse> {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/reprocess`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        extraction_method: extractionMethod,
      }),
    });

    return readJson<ProcessResponse>(response, 'Failed to reprocess document');
  }

  static async pollDocumentStatus(
    documentId: string,
    jobId?: string,
    onProgress?: (result: DocumentResult, attempt: number, elapsed: number) => void
  ): Promise<DocumentResult> {
    const maxAttempts = 120;
    const pollInterval = 5000;
    const startTime = Date.now();

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);

      try {
        const result = await this.checkDocumentStatus(documentId, jobId);
        onProgress?.(result, attempt, elapsedSeconds);

        if (['COMPLETED', 'LOW_CONFIDENCE', 'NEEDS_REVIEW'].includes(result.status)) {
          return result;
        }

        if (result.status === 'ERROR') {
          throw new Error(result.error || 'Falha no processamento do documento');
        }

        const jobStatus = result.job_status || result.jobStatus;
        if (result.status === 'PENDING_REPROCESS' || jobStatus === 'NOT_FOUND') {
          return result;
        }

        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
        }
      } catch (err) {
        if (attempt === maxAttempts) {
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }
    }

    throw new Error(`Timeout: o processamento excedeu ${maxAttempts * pollInterval / 60000} minutos`);
  }

  static downloadText(text: string, filename: string): void {
    const blob = new Blob([text], { type: 'text/plain' });
    this.downloadBlob(blob, filename);
  }

  static downloadJson(data: unknown, filename: string): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    this.downloadBlob(blob, filename);
  }

  static downloadCsv(rows: Array<Record<string, unknown>>, filename: string): void {
    const headers = ['document_id', 'status', 'document_type', 'extraction_method', 'created_at', 'updated_at'];
    const csvRows = [
      headers.join(','),
      ...rows.map((row) =>
        headers
          .map((header) => `"${String(row[header] ?? '').replace(/"/g, '""')}"`)
          .join(',')
      ),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8' });
    this.downloadBlob(blob, filename);
  }

  private static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
