import { FileText, Copy, Download, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import type { DocumentResult } from '../types/document';
import { DocumentService } from '../services/documentService';

interface ResultDisplayProps {
  result: DocumentResult;
}

export function ResultDisplay({ result }: ResultDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (result.raw_text) {
      await navigator.clipboard.writeText(result.raw_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (result.raw_text) {
      const filename = `extracted_text_${result.document_id.slice(0, 8)}.txt`;
      DocumentService.downloadText(result.raw_text, filename);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <h3 className="text-lg font-semibold text-green-900">
            Processamento Concluído!
          </h3>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Document ID</p>
            <p className="font-mono text-xs text-gray-900 truncate">
              {result.document_id}
            </p>
          </div>
          {result.extracted && (
            <>
              <div>
                <p className="text-gray-600">Linhas</p>
                <p className="font-semibold text-gray-900">
                  {result.extracted.line_count}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Palavras</p>
                <p className="font-semibold text-gray-900">
                  {result.extracted.word_count}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Data de Extração</p>
                <p className="text-xs text-gray-900">
                  {new Date(result.extracted.extraction_timestamp).toLocaleString('pt-BR')}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {result.raw_text && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-gray-600" />
              <h4 className="font-medium text-gray-900">Texto Extraído</h4>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleCopy}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-green-600">Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Baixar</span>
              </button>
            </div>
          </div>
          <div className="p-4 bg-white max-h-96 overflow-y-auto">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
              {result.raw_text}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
