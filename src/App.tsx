import { useState } from 'react';
import { FileText, RefreshCw, AlertCircle, Upload } from 'lucide-react';
import { FileUploader } from './components/FileUploader';
import { ProgressIndicator } from './components/ProgressIndicator';
import { ResultDisplay } from './components/ResultDisplay';
import { BatchStatusDisplay } from './components/BatchStatusDisplay';
import { useDocumentUpload } from './hooks/useDocumentUpload';
import { useBatchUpload } from './hooks/useBatchUpload';

type ExtractionMethod = 'detect_text' | 'analyze_document' | 'analyze_expense';
type DocumentType = 'nota_fiscal' | 'recibo' | 'contrato' | 'boleto' | 'ordem_servico' | 'generic' | '';

function App() {
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [extractionMethod, setExtractionMethod] = useState<ExtractionMethod>('detect_text');
  const [documentType, setDocumentType] = useState<DocumentType>('');
  const [useLlm, setUseLlm] = useState<boolean>(false);
  
  // Hooks para upload único e batch
  const { progress, result, error, isUploading, uploadDocument, reprocessDocument, reset } = useDocumentUpload();
  const { 
    progress: batchProgress, 
    result: batchResult, 
    error: batchError, 
    isUploading: isBatchUploading, 
    uploadBatch, 
    reset: resetBatch 
  } = useBatchUpload();

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setSelectedFiles([file]);
  };

  const handleFilesSelect = (files: File[]) => {
    setSelectedFiles(files);
    setSelectedFile(files.length === 1 ? files[0] : null);
  };

  const handleUpload = async () => {
    if (mode === 'batch' && selectedFiles.length > 0) {
      await uploadBatch(selectedFiles, extractionMethod, documentType || undefined);
    } else if (selectedFile) {
      await uploadDocument(selectedFile, extractionMethod, documentType || undefined, useLlm);
    }
  };

  const handleReprocess = async (documentId: string, useLlm?: boolean) => {
    await reprocessDocument(documentId, useLlm);
  };

  const handleReset = () => {
    setSelectedFile(null);
    setSelectedFiles([]);
    setDocumentType('');
    setUseLlm(false);
    if (mode === 'batch') {
      resetBatch();
    } else {
      reset();
    }
  };

  const handleModeChange = (newMode: 'single' | 'batch') => {
    setMode(newMode);
    setSelectedFile(null);
    setSelectedFiles([]);
    reset();
    resetBatch();
  };

  const isProcessing = mode === 'batch' ? isBatchUploading : isUploading;
  const currentProgress = mode === 'batch' ? batchProgress : progress;
  const currentError = mode === 'batch' ? batchError : error;

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
          {/* Toggle entre modo único e batch */}
          <div className="flex items-center justify-center space-x-4 p-4 bg-gray-50 rounded-lg">
            <button
              onClick={() => handleModeChange('single')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                mode === 'single'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
              disabled={isProcessing}
            >
              Upload Único
            </button>
            <button
              onClick={() => handleModeChange('batch')}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                mode === 'batch'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
              disabled={isProcessing}
            >
              Upload em Lote
            </button>
          </div>

          {!result && !batchResult && !error && !batchError && (
            <>
              <div className="space-y-2">
                <label htmlFor="document-type" className="block text-sm font-medium text-gray-700">
                  Tipo de Documento <span className="text-gray-400 font-normal">(Opcional)</span>
                </label>
                <select
                  id="document-type"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value as DocumentType)}
                  disabled={isProcessing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Selecione um tipo (opcional)</option>
                  <option value="nota_fiscal">Nota Fiscal</option>
                  <option value="recibo">Recibo</option>
                  <option value="contrato">Contrato</option>
                  <option value="boleto">Boleto</option>
                  <option value="ordem_servico">Ordem de Serviço</option>
                  <option value="generic">Genérico</option>
                </select>
                <p className="text-xs text-gray-500">
                  O tipo de documento ajuda a formatar melhor os resultados da extração.
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="extraction-method" className="block text-sm font-medium text-gray-700">
                  Método de Extração
                </label>
                <select
                  id="extraction-method"
                  value={extractionMethod}
                  onChange={(e) => setExtractionMethod(e.target.value as ExtractionMethod)}
                  disabled={isProcessing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="detect_text">Detect Text (Mais rápido, texto simples)</option>
                  <option value="analyze_document">Analyze Document (FORMS e TABLES, mais detalhado)</option>
                  <option value="analyze_expense">Analyze Expense (Otimizado para notas fiscais)</option>
                </select>
                <p className="text-xs text-gray-500">
                  Escolha o método de extração do Textract. Analyze Expense é recomendado para notas fiscais.
                </p>
              </div>

              <div className="flex items-center space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <input
                  type="checkbox"
                  id="use-llm"
                  checked={useLlm}
                  onChange={(e) => setUseLlm(e.target.checked)}
                  disabled={isProcessing}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
                />
                <label htmlFor="use-llm" className="flex-1 text-sm font-medium text-gray-700 cursor-pointer">
                  Usar LLM para correção do contrato JSON
                </label>
              </div>
              <p className="text-xs text-gray-500 -mt-2">
                Quando habilitado, o LLM processa o texto extraído para melhorar a estruturação dos dados em JSON.
              </p>

              <FileUploader
                onFileSelect={handleFileSelect}
                onFilesSelect={handleFilesSelect}
                disabled={isProcessing}
                multiple={mode === 'batch'}
              />

              {((mode === 'single' && selectedFile) || (mode === 'batch' && selectedFiles.length > 0)) && !isProcessing && (
                <button
                  onClick={handleUpload}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Upload className="w-5 h-5" />
                  <span>
                    {mode === 'batch' 
                      ? `Fazer Upload e Processar ${selectedFiles.length} Arquivo(s)`
                      : 'Fazer Upload e Processar'
                    }
                  </span>
                </button>
              )}
            </>
          )}

          <ProgressIndicator progress={currentProgress} />

          {currentError && (
            <div className="border border-red-200 bg-red-50 rounded-lg p-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-red-900 mb-2">
                    Erro no Processamento
                  </h3>
                  <p className="text-sm text-red-800">{currentError}</p>
                </div>
              </div>
            </div>
          )}

          {result && mode === 'single' && <ResultDisplay result={result} onReprocess={handleReprocess} />}
          {batchResult && mode === 'batch' && <BatchStatusDisplay result={batchResult} />}

          {(result || batchResult || error || batchError) && (
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
          <p>Arquivos aceitos: PDF, JPG, JPEG ou PNG. Tamanho máximo: 100MB</p>
          <p className="mt-1">O processamento geralmente leva de 30 segundos a 3 minutos</p>
        </div>
      </div>
    </div>
  );
}

export default App;
