import type { UploadUrlResponse, ProcessResponse, DocumentResult } from '../types/document';

const API_BASE_URL = 'https://vxe3nzepie.execute-api.us-east-1.amazonaws.com/dev';

export class DocumentService {
  static async requestUploadUrl(filename: string): Promise<UploadUrlResponse> {
    const response = await fetch(`${API_BASE_URL}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename,
        content_type: 'application/pdf',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to request upload URL: ${response.statusText}`);
    }

    return response.json();
  }

  static async uploadToS3(uploadUrl: string, file: File): Promise<void> {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': 'application/pdf',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to upload file to S3: ${response.statusText}`);
    }
  }

  static async processDocument(documentId: string): Promise<ProcessResponse> {
    const response = await fetch(`${API_BASE_URL}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        process: true,
        document_id: documentId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to process document: ${response.statusText}`);
    }

    return response.json();
  }

  static async getDocumentStatus(documentId: string): Promise<DocumentResult> {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get document status: ${response.statusText}`);
    }

    return response.json();
  }

  static async pollDocumentStatus(
    documentId: string,
    onProgress?: (result: DocumentResult) => void
  ): Promise<DocumentResult> {
    const maxAttempts = 60;
    const pollInterval = 5000;

    for (let i = 0; i < maxAttempts; i++) {
      const result = await this.getDocumentStatus(documentId);

      if (onProgress) {
        onProgress(result);
      }

      if (result.status === 'COMPLETED') {
        return result;
      }

      if (result.status === 'ERROR') {
        throw new Error(result.error || 'Document processing failed');
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Timeout: Document processing took too long');
  }

  static downloadText(text: string, filename: string): void {
    const blob = new Blob([text], { type: 'text/plain' });
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
