import type { BatchResponse, BatchStatusResponse } from '../types/document';

// URL do ECS (ALB) para batch processing - se não definida, usa API Gateway
const ECS_BASE_URL = import.meta.env.VITE_ECS_BASE_URL || import.meta.env.VITE_API_BASE_URL || 'https://hjutldvak8.execute-api.us-east-1.amazonaws.com/dev';
const API_KEY = import.meta.env.VITE_API_KEY || '';

/**
 * Cria headers padrão para requisições à API Gateway
 */
function getHeaders(includeContentType: boolean = true): HeadersInit {
  const headers: HeadersInit = {};
  
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  
  if (API_KEY) {
    headers['x-api-key'] = API_KEY;
  }
  
  return headers;
}

export class BatchService {
  /**
   * Cria um novo lote de processamento com múltiplos documentos
   * 
   * @param documentIds - Array de IDs de documentos já enviados para o S3
   */
  static async createBatch(documentIds: string[]): Promise<BatchResponse> {
    const response = await fetch(`${ECS_BASE_URL}/batch`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        documents: documentIds.map(id => ({ document_id: id }))
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create batch: ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Consulta o status de um lote de processamento
   * 
   * @param batchId - ID do lote
   */
  static async getBatchStatus(batchId: string): Promise<BatchStatusResponse> {
    const response = await fetch(`${ECS_BASE_URL}/batch/${batchId}`, {
      method: 'GET',
      headers: getHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get batch status: ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  /**
   * Faz polling do status do lote até que todos os documentos sejam processados
   * 
   * @param batchId - ID do lote
   * @param onProgress - Callback chamado a cada atualização de status
   * @param pollInterval - Intervalo entre verificações em ms (default: 5 segundos)
   * @param maxAttempts - Número máximo de tentativas (default: 120 = 10 minutos)
   */
  static async pollBatchStatus(
    batchId: string,
    onProgress?: (status: BatchStatusResponse, attempt: number, elapsed: number) => void,
    pollInterval: number = 5000,
    maxAttempts: number = 120
  ): Promise<BatchStatusResponse> {
    const startTime = Date.now();

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);

      try {
        const status = await this.getBatchStatus(batchId);

        if (onProgress) {
          onProgress(status, attempt, elapsedSeconds);
        }

        // Se todos os documentos foram processados (com sucesso ou erro)
        if (status.status === 'COMPLETED' || status.status === 'FAILED') {
          return status;
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

    // Retorna o último status conhecido
    return this.getBatchStatus(batchId);
  }
}

