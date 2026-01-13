import { useRef, useState } from 'react';
import { Upload, File, AlertCircle } from 'lucide-react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  onFilesSelect?: (files: File[]) => void;
  disabled?: boolean;
  multiple?: boolean;
}

export function FileUploader({ onFileSelect, onFilesSelect, disabled, multiple = false }: FileUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Aceita PDF e imagens (JPG, JPEG, PNG)
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      // Verifica também pela extensão do arquivo
      const extension = file.name.split('.').pop()?.toLowerCase();
      const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
      
      if (!extension || !allowedExtensions.includes(extension)) {
        return 'Apenas arquivos PDF, JPG, JPEG ou PNG são aceitos';
      }
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
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (multiple) {
      // Modo múltiplos arquivos
      const validFiles: File[] = [];
      const errors: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const error = validateFile(file);
        if (error) {
          errors.push(`${file.name}: ${error}`);
        } else {
          validFiles.push(file);
        }
      }

      if (errors.length > 0) {
        setValidationError(errors.join('; '));
      } else {
        setValidationError(null);
      }

      setSelectedFiles(validFiles);
      if (onFilesSelect && validFiles.length > 0) {
        onFilesSelect(validFiles);
      }
    } else {
      // Modo arquivo único
      const file = files[0];
      const error = validateFile(file);
      if (error) {
        setValidationError(error);
        setSelectedFile(null);
        setSelectedFiles([]);
        return;
      }

      setValidationError(null);
      setSelectedFile(file);
      setSelectedFiles([file]);
      onFileSelect(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/jpg,image/png,.pdf,.jpg,.jpeg,.png"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
        multiple={multiple}
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
              {multiple 
                ? 'Clique para selecionar arquivos (PDF, JPG, JPEG ou PNG)'
                : 'Clique para selecionar um arquivo (PDF, JPG, JPEG ou PNG)'
              }
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Tamanho máximo: 100MB por arquivo
            </p>
          </div>
        </div>
      </button>

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          {selectedFiles.map((file, index) => (
            <div key={index} className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
              <File className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-900 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-green-700">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </div>
          ))}
          {selectedFiles.length > 1 && (
            <p className="text-xs text-gray-600 text-center">
              {selectedFiles.length} arquivo(s) selecionado(s)
            </p>
          )}
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
