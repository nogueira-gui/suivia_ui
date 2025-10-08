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

  const uploadDocument = useCallback(async (file: File) => {
    setIsUploading(true);
    setError(null);
    setResult(null);
    startTimer();

    try {
      updateProgress('requesting_url', 'Solicitando URL de upload...', 10);
      const uploadData = await DocumentService.requestUploadUrl(file.name);

      updateProgress('uploading', 'Enviando arquivo para S3...', 30);
      await DocumentService.uploadToS3(uploadData.upload_url, file);

      updateProgress('processing', 'Iniciando processamento OCR...', 50);
      await DocumentService.processDocument(uploadData.document_id);

      updateProgress('processing', 'Processando documento...', 60);
      const finalResult = await DocumentService.pollDocumentStatus(
        uploadData.document_id,
        (intermediateResult) => {
          const progressValue = 60 + Math.random() * 30;
          updateProgress('processing', 'Extraindo texto do documento...', progressValue);
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
