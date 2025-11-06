import type { UploadUrlResponse, ProcessResponse, DocumentResult } from '../types/document';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export class DocumentService {
  static async requestUploadUrl(filename: string): Promise<UploadUrlResponse> {
    const response = await fetch(`${API_BASE_URL}/documents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename,
        document_type: "nota_fiscal",
        content_type: 'application/pdf',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to request upload URL: ${response.statusText}`);
    }

    return response.json();
  }

  static async uploadToS3(uploadUrl: string, file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', 'application/pdf');
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Failed to upload file to S3: ${xhr.status} ${xhr.statusText} - ${xhr.responseText}`));
        }
      };
      
      xhr.onerror = () => {
        reject(new Error(`Network error during S3 upload. Status: ${xhr.status}`));
      };
      
      xhr.ontimeout = () => {
        reject(new Error('Upload to S3 timed out'));
      };
      
      // Timeout de 5 minutos para uploads grandes
      xhr.timeout = 300000;
      
      xhr.send(file);
    });
  }

  static async processDocument(documentId: string): Promise<ProcessResponse> {
    const response = await fetch(`${API_BASE_URL}/documents/process`, {
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

  /**
   * Verifica o status do job e processa automaticamente se concluído
   * Este é o novo endpoint que faz polling ativo no Textract
   * 
   * @param documentId - ID do documento
   * @param jobId - (Opcional) Job ID retornado pelo /process. Se fornecido, consulta direto o Textract
   */
  static async checkDocumentStatus(documentId: string, jobId?: string): Promise<DocumentResult> {
    const response = await fetch(`${API_BASE_URL}/documents/${documentId}/check-status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // ⭐ NOVO: Passa job_id no body se fornecido
      body: jobId ? JSON.stringify({ job_id: jobId }) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to check document status: ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  static async pollDocumentStatus(
    documentId: string,
    jobId?: string,
    onProgress?: (result: DocumentResult, attempt: number, elapsed: number) => void
  ): Promise<DocumentResult> {
    // Timeout de 10 minutos (conforme recomendação do backend)
    const maxAttempts = 120; // 120 tentativas * 5 segundos = 10 minutos
    const pollInterval = 5000; // 5 segundos entre tentativas
    const startTime = Date.now();

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);

      try {
        // ⭐ NOVO: Usa o novo endpoint que faz polling ativo no Textract COM job_id
        const result = await this.checkDocumentStatus(documentId, jobId);

        if (onProgress) {
          onProgress(result, attempt, elapsedSeconds);
        }

        if (result.status === 'COMPLETED') {
          return result;
        }

        if (result.status === 'ERROR') {
          throw new Error(result.error || 'Falha no processamento do documento');
        }

        // Se ainda está processando, aguarda antes da próxima tentativa
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
      } catch (err) {
        // Se for erro de timeout ou rede, tenta novamente
        if (attempt === maxAttempts) {
          throw err;
        }
        
        // Aguarda um pouco mais em caso de erro (backoff)
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }

    throw new Error(
      `Timeout: O processamento do documento excedeu o tempo máximo de ${maxAttempts * pollInterval / 60000} minutos`
    );
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
