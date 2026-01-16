import { useState, useCallback, useRef } from 'react';
import { DocumentService } from '../services/documentService';
import { BatchService } from '../services/batchService';
import type { BatchStatusResponse, UploadUrlResponse, DocumentStatus } from '../types/document';

interface BatchProgress {
  step: 'idle' | 'uploading' | 'creating_batch' | 'processing' | 'completed' | 'error';
  message: string;
  progress: number;
  elapsedTime: number;
  currentFile?: number;
  totalFiles?: number;
}

interface BatchResult {
  batch_id: string;
  status: 'PROCESSING' | 'COMPLETED' | 'FAILED';
  statistics: {
    total: number;
    completed: number;
    processing: number;
    error: number;
    pending: number;
  };
  documents: Array<{
    document_id: string;
    status: DocumentStatus;
    error?: string;
    extracted?: any;
    raw_text?: string;
    job_id?: string;
    source_s3_key?: string;
    created_at?: string;
  }>;
}

export function useBatchUpload() {
  const [progress, setProgress] = useState<BatchProgress>({
    step: 'idle',
    message: '',
    progress: 0,
    elapsedTime: 0,
  });
  const [result, setResult] = useState<BatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const updateProgress = useCallback((
    step: BatchProgress['step'],
    message: string,
    progressValue: number,
    currentFile?: number,
    totalFiles?: number
  ) => {
    const elapsed = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0;
    setProgress({
      step,
      message,
      progress: progressValue,
      elapsedTime: elapsed,
      currentFile,
      totalFiles,
    });
  }, []);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setProgress(prev => ({ ...prev, elapsedTime: elapsed }));
      }
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    startTimeRef.current = 0;
  }, []);

  const uploadBatch = useCallback(async (
    files: File[],
    extractionMethod?: string,
    documentType?: string
  ) => {
    setIsUploading(true);
    setError(null);
    setResult(null);
    startTimer();

    try {
      const totalFiles = files.length;
      const documentIds: string[] = [];

      // Passo 1: Upload de todos os arquivos
      updateProgress('uploading', `Enviando ${totalFiles} arquivo(s)...`, 10, 0, totalFiles);
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileNumber = i + 1;
        
        updateProgress(
          'uploading',
          `Enviando arquivo ${fileNumber} de ${totalFiles}: ${file.name}...`,
          Math.floor((fileNumber / totalFiles) * 40) + 10,
          fileNumber,
          totalFiles
        );

        // Solicita URL de upload
        const uploadData: UploadUrlResponse = await DocumentService.requestUploadUrl(
          file.name,
          extractionMethod,
          documentType
        );

        const documentId = uploadData.document_id || uploadData.documentId;
        if (!documentId) {
          throw new Error(`ID do documento não fornecido para o arquivo: ${file.name}`);
        }

        // Faz upload para S3
        const uploadUrl = uploadData.upload_url || uploadData.uploadUrl;
        const contentType = uploadData.content_type || uploadData.contentType || 'application/octet-stream';
        
        if (!uploadUrl) {
          throw new Error(`URL de upload não fornecida para o arquivo: ${file.name}`);
        }

        await DocumentService.uploadToS3(uploadUrl, file, contentType);
        documentIds.push(documentId);
      }

      // Passo 2: Criar lote de processamento
      updateProgress('creating_batch', 'Criando lote de processamento...', 50);
      const batchResponse = await BatchService.createBatch(documentIds);

      // Passo 3: Monitorar processamento do lote
      updateProgress('processing', 'Processando documentos em lote...', 60);
      
      const finalStatus = await BatchService.pollBatchStatus(
        batchResponse.batch_id,
        (status, attempt, elapsed) => {
          const completed = status.statistics.completed;
          const total = status.statistics.total;
          const progressValue = Math.floor((completed / total) * 30) + 60; // 60-90%
          
          updateProgress(
            'processing',
            `Processando: ${completed}/${total} documentos concluídos...`,
            progressValue
          );
        }
      );

      // Passo 4: Resultado final
      updateProgress('completed', 'Processamento em lote concluído!', 100);
      
      setResult({
        batch_id: finalStatus.batch_id,
        status: finalStatus.status,
        statistics: finalStatus.statistics,
        documents: finalStatus.documents.map(doc => ({
          document_id: doc.document_id,
          status: doc.status,
          error: doc.error,
          extracted: doc.extracted,
          raw_text: doc.raw_text,
          job_id: doc.job_id,
          source_s3_key: doc.source_s3_key,
          created_at: doc.created_at,
        })),
      });

      stopTimer();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido no processamento em lote';
      setError(errorMessage);
      updateProgress('error', `Erro: ${errorMessage}`, 0);
      stopTimer();
    } finally {
      setIsUploading(false);
    }
  }, [updateProgress, startTimer, stopTimer]);

  const reset = useCallback(() => {
    setProgress({
      step: 'idle',
      message: '',
      progress: 0,
      elapsedTime: 0,
    });
    setResult(null);
    setError(null);
    stopTimer();
  }, [stopTimer]);

  return {
    progress,
    result,
    error,
    isUploading,
    uploadBatch,
    reset,
  };
}

