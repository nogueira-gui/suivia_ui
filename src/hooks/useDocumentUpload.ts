import { useState, useCallback, useRef, useEffect } from 'react';
import { DocumentService } from '../services/documentService';
import type { UploadProgress, DocumentResult } from '../types/document';

export function useDocumentUpload() {
  const [progress, setProgress] = useState<UploadProgress>({
    step: 'idle',
    message: '',
    progress: 0,
    elapsedTime: 0,
  });
  const [result, setResult] = useState<DocumentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const updateProgress = useCallback((
    step: UploadProgress['step'],
    message: string,
    progressValue: number
  ) => {
    const elapsed = startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0;
    setProgress({
      step,
      message,
      progress: progressValue,
      elapsedTime: elapsed,
    });
  }, []);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setProgress(prev => ({ ...prev, elapsedTime: elapsed }));
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const uploadDocument = useCallback(async (
    file: File, 
    extractionMethod?: string,
    documentType?: string,
    useLlm?: boolean
  ) => {
    setIsUploading(true);
    setError(null);
    setResult(null);
    startTimer();

    try {
      updateProgress('requesting_url', 'Solicitando URL de upload...', 10);
      const uploadData = await DocumentService.requestUploadUrl(
        file.name, 
        extractionMethod,
        documentType
      );

      updateProgress('uploading', 'Enviando arquivo para S3...', 30);
      // Suporta ambos os formatos: snake_case e camelCase
      const uploadUrl = uploadData.upload_url || uploadData.uploadUrl;
      const contentType = uploadData.content_type || uploadData.contentType || 'application/octet-stream';
      
      if (!uploadUrl) {
        throw new Error('URL de upload não fornecida pelo servidor');
      }
      
      await DocumentService.uploadToS3(uploadUrl, file, contentType);

      updateProgress('processing', 'Iniciando processamento OCR...', 50);
      // ⭐ NOVO: Salva o job_id retornado pelo /process
      const documentId = uploadData.document_id || uploadData.documentId;
      
      if (!documentId) {
        throw new Error('ID do documento não fornecido pelo servidor');
      }
      
      const processResponse = await DocumentService.processDocument(documentId, useLlm);
      // Suporta ambos os formatos: snake_case e camelCase
      const jobId = processResponse.jobId || processResponse.job_id;

      // ⭐ NOVO: Não precisa mais aguardar! Passa o job_id direto para o polling
      updateProgress('processing', 'Verificando status do processamento...', 60);
      const finalResult = await DocumentService.pollDocumentStatus(
        documentId,
        jobId,  // ⭐ PASSA O JOB_ID AQUI
        (_result, attempt, elapsed) => {
          // Calcula progresso baseado no tempo decorrido (estimativa de 30s a 3min)
          const estimatedMaxTime = 180; // 3 minutos
          const progressValue = Math.min(90, 60 + (elapsed / estimatedMaxTime) * 30);
          
          const mins = Math.floor(elapsed / 60);
          const secs = elapsed % 60;
          const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
          
          updateProgress(
            'processing', 
            `Processando documento... (tentativa ${attempt}, tempo: ${timeStr})`, 
            progressValue
          );
        }
      );

      updateProgress('completed', 'Processamento concluído!', 100);
      setResult(finalResult);
      stopTimer();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      updateProgress('error', errorMessage, 0);
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
    setIsUploading(false);
    stopTimer();
    startTimeRef.current = 0;
  }, [stopTimer]);

  return {
    progress,
    result,
    error,
    isUploading,
    uploadDocument,
    reset,
  };
}
