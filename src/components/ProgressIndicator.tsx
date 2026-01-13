import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import type { UploadProgress } from '../types/document';

interface BatchProgress {
  step: 'idle' | 'uploading' | 'creating_batch' | 'processing' | 'completed' | 'error';
  message: string;
  progress: number;
  elapsedTime: number;
  currentFile?: number;
  totalFiles?: number;
}

interface ProgressIndicatorProps {
  progress: UploadProgress | BatchProgress;
}

export function ProgressIndicator({ progress }: ProgressIndicatorProps) {
  if (progress.step === 'idle') return null;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    switch (progress.step) {
      case 'completed':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getStatusIcon = () => {
    switch (progress.step) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
    }
  };

  const getStatusText = () => {
    switch (progress.step) {
      case 'completed':
        return 'text-green-900';
      case 'error':
        return 'text-red-900';
      default:
        return 'text-blue-900';
    }
  };

  return (
    <div className={`border rounded-lg p-6 ${getStatusColor()} transition-all`}>
      <div className="flex items-start space-x-3 mb-4">
        {getStatusIcon()}
        <div className="flex-1">
          <p className={`text-sm font-medium ${getStatusText()}`}>
            {progress.message}
          </p>
          {('currentFile' in progress && 'totalFiles' in progress && progress.currentFile && progress.totalFiles) && (
            <p className="text-xs text-gray-600 mt-1">
              Arquivo {progress.currentFile} de {progress.totalFiles}
            </p>
          )}
          {progress.elapsedTime > 0 && (
            <p className="text-xs text-gray-600 mt-1">
              Tempo decorrido: {formatTime(progress.elapsedTime)}
            </p>
          )}
        </div>
      </div>

      {progress.step !== 'idle' && 
       progress.step !== 'completed' && 
       progress.step !== 'error' && 
       (progress.step === 'uploading' || 
        progress.step === 'creating_batch' || 
        progress.step === 'processing' || 
        progress.step === 'requesting_url') && (
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="bg-blue-600 h-full transition-all duration-500 ease-out"
            style={{ width: `${progress.progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
