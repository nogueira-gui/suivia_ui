import { useState } from 'react';
import { CheckCircle, XCircle, Clock, FileText, AlertCircle, Eye, ChevronUp } from 'lucide-react';
import type { BatchResult } from '../hooks/useBatchUpload';

interface BatchStatusDisplayProps {
  result: BatchResult;
}

export function BatchStatusDisplay({ result }: BatchStatusDisplayProps) {
  const { statistics, documents, status } = result;
  const [expandedDocuments, setExpandedDocuments] = useState<Set<string>>(new Set());

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'ERROR':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'PROCESSING':
      case 'PENDING':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-50 border-green-200 text-green-900';
      case 'ERROR':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'PROCESSING':
      case 'PENDING':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
  };

  const toggleDocumentDetails = (documentId: string) => {
    const newExpanded = new Set(expandedDocuments);
    if (newExpanded.has(documentId)) {
      newExpanded.delete(documentId);
    } else {
      newExpanded.add(documentId);
    }
    setExpandedDocuments(newExpanded);
  };

  const isExpanded = (documentId: string) => expandedDocuments.has(documentId);

  const formatCurrency = (value?: number | string) => {
    if (!value || value === '0' || value === '0.00') return 'R$ 0,00';
    const num = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
    if (isNaN(num)) return 'N/A';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
  };

  const formatCNPJ = (cnpj?: string) => {
    if (!cnpj || cnpj === '00000000000000') return 'N/A';
    return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Resumo do Lote */}
      <div className="border border-gray-200 rounded-lg p-6 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Lote de Processamento
          </h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
            status === 'FAILED' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {status === 'COMPLETED' ? 'Concluído' :
             status === 'FAILED' ? 'Falhou' :
             'Processando'}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{statistics.total}</p>
            <p className="text-xs text-gray-600">Total</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{statistics.completed}</p>
            <p className="text-xs text-gray-600">Concluídos</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">{statistics.processing}</p>
            <p className="text-xs text-gray-600">Processando</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{statistics.error}</p>
            <p className="text-xs text-gray-600">Erros</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-600">{statistics.pending}</p>
            <p className="text-xs text-gray-600">Pendentes</p>
          </div>
        </div>

        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(statistics.completed / statistics.total) * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-1 text-center">
            {Math.round((statistics.completed / statistics.total) * 100)}% concluído
          </p>
        </div>
      </div>

      {/* Lista de Documentos */}
      <div className="border border-gray-200 rounded-lg p-6 bg-white">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Documentos ({documents.length})
        </h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {documents.map((doc, index) => {
            const expanded = isExpanded(doc.document_id);
            // Verifica se há detalhes para exibir (extracted ou raw_text)
            const hasExtracted = doc.extracted && (
              (typeof doc.extracted === 'object' && Object.keys(doc.extracted).length > 0) ||
              doc.extracted.raw_text || 
              doc.extracted.rawText ||
              doc.extracted.nota_fiscal ||
              doc.extracted.raw_expense_data
            );
            const hasRawText = doc.raw_text && doc.raw_text.trim().length > 0;
            const hasDetails = doc.status === 'COMPLETED' && (hasExtracted || hasRawText);
            
            return (
              <div key={doc.document_id} className="space-y-2">
                <div
                  className={`flex items-center space-x-3 p-3 rounded-lg border ${getStatusColor(doc.status)} ${
                    hasDetails ? 'cursor-pointer hover:shadow-sm transition-shadow' : ''
                  }`}
                  onClick={hasDetails ? () => toggleDocumentDetails(doc.document_id) : undefined}
                >
                  {getStatusIcon(doc.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      Documento #{index + 1}
                    </p>
                    <p className="text-xs opacity-75 truncate">
                      ID: {doc.document_id}
                    </p>
                    {doc.error && (
                      <p className="text-xs mt-1 opacity-90">
                        <AlertCircle className="w-3 h-3 inline mr-1" />
                        {doc.error}
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-medium px-2 py-1 rounded">
                    {doc.status === 'COMPLETED' ? 'Concluído' :
                     doc.status === 'ERROR' ? 'Erro' :
                     doc.status === 'PROCESSING' ? 'Processando' :
                     doc.status}
                  </span>
                  {hasDetails && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDocumentDetails(doc.document_id);
                      }}
                      className="ml-2 p-1.5 rounded-md hover:bg-white/50 transition-colors"
                      title={expanded ? 'Ocultar detalhes' : 'Ver detalhes'}
                    >
                      {expanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  )}
                </div>
                
                {/* Detalhes Expandidos */}
                {expanded && hasDetails && (doc.extracted || doc.raw_text) && (
                  <div className="ml-8 mr-2 mb-2 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <DocumentDetails 
                      document={doc} 
                      formatCurrency={formatCurrency}
                      formatCNPJ={formatCNPJ}
                      formatDate={formatDate}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Informações do Lote */}
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
        <p className="text-xs text-gray-600">
          <strong>Batch ID:</strong> {result.batch_id}
        </p>
        <p className="text-xs text-gray-600 mt-1">
          Use este ID para consultar o status do lote posteriormente.
        </p>
      </div>
    </div>
  );
}

// Componente para exibir detalhes do documento
function DocumentDetails({ 
  document, 
  formatCurrency, 
  formatCNPJ, 
  formatDate 
}: { 
  document: { extracted?: any; raw_text?: string };
  formatCurrency: (value?: number | string) => string;
  formatCNPJ: (cnpj?: string) => string;
  formatDate: (dateStr?: string) => string;
}) {
  const { extracted, raw_text } = document;
  
  // Verifica se é nota fiscal
  const isNotaFiscal = extracted?.nota_fiscal || extracted?.document_type === 'nota_fiscal';
  const notaFiscal = extracted?.nota_fiscal;
  
  // Verifica se é detect_text (apenas texto)
  const isDetectText = !isNotaFiscal && !extracted?.nota_fiscal && !extracted?.raw_expense_data;
  const rawText = raw_text || extracted?.raw_text || extracted?.rawText;

  if (isNotaFiscal && notaFiscal) {
    return (
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-900 border-b pb-2">Detalhes da Nota Fiscal</h4>
        
        {/* Cabeçalho */}
        {notaFiscal.cabecalho && (
          <div className="space-y-3">
            <h5 className="font-medium text-gray-700">Cabeçalho</h5>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {notaFiscal.cabecalho.numero && (
                <div>
                  <p className="text-gray-600">Número</p>
                  <p className="font-semibold text-gray-900">{notaFiscal.cabecalho.numero}</p>
                </div>
              )}
              {notaFiscal.cabecalho.serie && (
                <div>
                  <p className="text-gray-600">Série</p>
                  <p className="font-semibold text-gray-900">{notaFiscal.cabecalho.serie}</p>
                </div>
              )}
              {notaFiscal.cabecalho.chave_acesso && (
                <div className="col-span-2">
                  <p className="text-gray-600">Chave de Acesso</p>
                  <p className="font-mono text-xs text-gray-900 break-all">{notaFiscal.cabecalho.chave_acesso}</p>
                </div>
              )}
              {notaFiscal.cabecalho.data_emissao && (
                <div>
                  <p className="text-gray-600">Data de Emissão</p>
                  <p className="font-semibold text-gray-900">{formatDate(notaFiscal.cabecalho.data_emissao)}</p>
                </div>
              )}
              {notaFiscal.cabecalho.valor_total !== undefined && (
                <div>
                  <p className="text-gray-600">Valor Total</p>
                  <p className="font-semibold text-green-600">{formatCurrency(notaFiscal.cabecalho.valor_total)}</p>
                </div>
              )}
              {notaFiscal.cabecalho.cnpj_emitente && (
                <div>
                  <p className="text-gray-600">CNPJ Emitente</p>
                  <p className="font-semibold text-gray-900">{formatCNPJ(notaFiscal.cabecalho.cnpj_emitente)}</p>
                </div>
              )}
              {notaFiscal.cabecalho.razao_social_emitente && (
                <div>
                  <p className="text-gray-600">Razão Social Emitente</p>
                  <p className="font-semibold text-gray-900">{notaFiscal.cabecalho.razao_social_emitente}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Itens */}
        {notaFiscal.itens && notaFiscal.itens.length > 0 && (
          <div className="space-y-3">
            <h5 className="font-medium text-gray-700">Itens ({notaFiscal.itens.length})</h5>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {notaFiscal.itens.map((item: any, idx: number) => (
                <div key={idx} className="p-2 bg-gray-50 rounded border border-gray-200 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    {item.descricao && (
                      <div className="col-span-2">
                        <p className="text-gray-600">Descrição</p>
                        <p className="font-medium text-gray-900">{item.descricao}</p>
                      </div>
                    )}
                    {item.quantidade !== undefined && (
                      <div>
                        <p className="text-gray-600">Quantidade</p>
                        <p className="font-semibold text-gray-900">{item.quantidade}</p>
                      </div>
                    )}
                    {item.valor_unitario !== undefined && (
                      <div>
                        <p className="text-gray-600">Valor Unitário</p>
                        <p className="font-semibold text-gray-900">{formatCurrency(item.valor_unitario)}</p>
                      </div>
                    )}
                    {item.valor_total !== undefined && (
                      <div>
                        <p className="text-gray-600">Valor Total</p>
                        <p className="font-semibold text-green-600">{formatCurrency(item.valor_total)}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Estatísticas */}
        {notaFiscal.confianca_extracao !== undefined && (
          <div className="pt-2 border-t">
            <p className="text-xs text-gray-600">
              Confiança: {Math.round(notaFiscal.confianca_extracao * 100)}%
            </p>
          </div>
        )}
      </div>
    );
  }

  // Documento genérico com texto
  if (isDetectText && rawText) {
    return (
      <div className="space-y-2">
        <h4 className="font-semibold text-gray-900 border-b pb-2">Texto Extraído</h4>
        <div className="max-h-64 overflow-y-auto">
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-gray-50 p-3 rounded border">
            {rawText}
          </pre>
        </div>
        {extracted?.line_count && (
          <div className="flex gap-4 text-xs text-gray-600 pt-2 border-t">
            <span>Linhas: {extracted.line_count}</span>
            {extracted.word_count && <span>Palavras: {extracted.word_count}</span>}
          </div>
        )}
      </div>
    );
  }

  // Dados genéricos
  return (
    <div className="space-y-2">
      <h4 className="font-semibold text-gray-900 border-b pb-2">Dados Extraídos</h4>
      <div className="text-sm text-gray-700">
        <pre className="bg-gray-50 p-3 rounded border overflow-auto max-h-64">
          {JSON.stringify(extracted, null, 2)}
        </pre>
      </div>
      {rawText && (
        <div className="mt-3">
          <h5 className="font-medium text-gray-700 mb-2">Texto Bruto</h5>
          <div className="max-h-48 overflow-y-auto">
            <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono bg-gray-50 p-3 rounded border">
              {rawText}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

