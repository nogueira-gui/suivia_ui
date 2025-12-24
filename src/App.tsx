import { useState } from 'react';
import { FileText, RefreshCw, AlertCircle } from 'lucide-react';
import { FileUploader } from './components/FileUploader';
import { ProgressIndicator } from './components/ProgressIndicator';
import { ResultDisplay } from './components/ResultDisplay';
import { useDocumentUpload } from './hooks/useDocumentUpload';

type ExtractionMethod = 'detect_text' | 'analyze_document' | 'analyze_expense';
type DocumentType = 'nota_fiscal' | 'recibo' | 'contrato' | 'boleto' | 'ordem_servico' | 'generic' | '';

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractionMethod, setExtractionMethod] = useState<ExtractionMethod>('detect_text');
  const [documentType, setDocumentType] = useState<DocumentType>('');
  const [useLlm, setUseLlm] = useState<boolean>(false);
  const { progress, result, error, isUploading, uploadDocument, reset } = useDocumentUpload();

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (selectedFile) {
      await uploadDocument(selectedFile, extractionMethod, documentType || undefined, useLlm);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setDocumentType('');
    setUseLlm(false);
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
              <div className="space-y-2">
                <label htmlFor="document-type" className="block text-sm font-medium text-gray-700">
                  Tipo de Documento <span className="text-gray-400 font-normal">(Opcional)</span>
                </label>
                <select
                  id="document-type"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value as DocumentType)}
                  disabled={isUploading}
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
                  disabled={isUploading}
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
                  disabled={isUploading}
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
          <p>Arquivos aceitos: PDF, JPG, JPEG ou PNG. Tamanho máximo: 100MB</p>
          <p className="mt-1">O processamento geralmente leva de 30 segundos a 3 minutos</p>
        </div>
      </div>
    </div>
  );
}

export default App;
