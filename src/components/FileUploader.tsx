import { useRef, useState } from 'react';
import { Upload, File, AlertCircle } from 'lucide-react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export function FileUploader({ onFileSelect, disabled }: FileUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (file.type !== 'application/pdf') {
      return 'Apenas arquivos PDF são aceitos';
    }

    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return 'Arquivo muito grande. Tamanho máximo: 100MB';
    }

    return null;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      setValidationError(error);
      setSelectedFile(null);
      return;
    }

    setValidationError(null);
    setSelectedFile(file);
    onFileSelect(file);
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />

      <button
        onClick={handleClick}
        disabled={disabled}
        className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex flex-col items-center space-y-3">
          <Upload className="w-12 h-12 text-gray-400" />
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">
              Clique para selecionar um arquivo PDF
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Tamanho máximo: 100MB
            </p>
          </div>
        </div>
      </button>

      {selectedFile && (
        <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <File className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-green-900 truncate">
              {selectedFile.name}
            </p>
            <p className="text-xs text-green-700">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
        </div>
      )}

      {validationError && (
        <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-800">{validationError}</p>
        </div>
      )}
    </div>
  );
}
