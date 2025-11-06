import { useState } from 'react';
import { FileText, RefreshCw, AlertCircle } from 'lucide-react';
import { FileUploader } from './components/FileUploader';
import { ProgressIndicator } from './components/ProgressIndicator';
import { ResultDisplay } from './components/ResultDisplay';
import { useDocumentUpload } from './hooks/useDocumentUpload';

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { progress, result, error, isUploading, uploadDocument, reset } = useDocumentUpload();

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (selectedFile) {
      await uploadDocument(selectedFile);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    reset();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-3">
            <FileText className="w-10 h-10 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Suivia OCR</h1>
          </div>
          <p className="text-gray-600">
            Sistema de processamento de documentos com extração automática de texto
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
          {!result && !error && (
            <>
              <FileUploader
                onFileSelect={handleFileSelect}
                disabled={isUploading}
              />

              {selectedFile && !isUploading && (
                <button
                  onClick={handleUpload}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <FileText className="w-5 h-5" />
                  <span>Fazer Upload e Processar</span>
                </button>
              )}
            </>
          )}

          <ProgressIndicator progress={progress} />

          {error && (
            <div className="border border-red-200 bg-red-50 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-red-900 mb-2">
                    Erro no Processamento
                  </h3>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}

          {result && <ResultDisplay result={result} />}

          {(result || error) && (
            <button
              onClick={handleReset}
              className="w-full bg-gray-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-5 h-5" />
              <span>Novo Upload</span>
            </button>
          )}
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Apenas arquivos PDF são aceitos. Tamanho máximo: 100MB</p>
          <p className="mt-1">O processamento geralmente leva de 30 segundos a 3 minutos</p>
        </div>
      </div>
    </div>
  );
}

export default App;
