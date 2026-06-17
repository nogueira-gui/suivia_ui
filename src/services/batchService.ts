import type { BatchListResponse, BatchResponse, BatchStatusResponse } from '../types/document';
import { API_BASE_URL } from './documentService';

const BATCH_BASE_URL = import.meta.env.VITE_ECS_BASE_URL || API_BASE_URL;
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

async function readJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`${fallbackMessage}: ${response.statusText}${errorText ? ` - ${errorText}` : ''}`);
  }

  return response.json() as Promise<T>;
}

export class BatchService {
  static async createBatch(documentIds: string[]): Promise<BatchResponse> {
    const response = await fetch(`${BATCH_BASE_URL}/batch`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        documents: documentIds.map((id) => ({ document_id: id })),
      }),
    });

    return readJson<BatchResponse>(response, 'Failed to create batch');
  }

  static async getBatchStatus(batchId: string): Promise<BatchStatusResponse> {
    const response = await fetch(`${BATCH_BASE_URL}/batch/${batchId}`, {
      method: 'GET',
      headers: getHeaders(),
    });

    return readJson<BatchStatusResponse>(response, 'Failed to get batch status');
  }

  static async listBatches(limit = 20): Promise<BatchListResponse> {
    const response = await fetch(`${BATCH_BASE_URL}/batch?limit=${limit}`, {
      method: 'GET',
      headers: getHeaders(),
    });

    return readJson<BatchListResponse>(response, 'Failed to list batches');
  }

  static async pollBatchStatus(
    batchId: string,
    onProgress?: (status: BatchStatusResponse, attempt: number, elapsed: number) => void,
    pollInterval = 5000,
    maxAttempts = 120
  ): Promise<BatchStatusResponse> {
    const startTime = Date.now();

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);

      try {
        const status = await this.getBatchStatus(batchId);
        onProgress?.(status, attempt, elapsedSeconds);

        if (['COMPLETED', 'FAILED', 'LOW_CONFIDENCE', 'NEEDS_REVIEW'].includes(status.status)) {
          return status;
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

    return this.getBatchStatus(batchId);
  }
}
