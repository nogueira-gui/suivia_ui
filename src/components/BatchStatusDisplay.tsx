import { CheckCircle, XCircle, Clock, FileText, AlertCircle } from 'lucide-react';
import type { BatchResult } from '../hooks/useBatchUpload';

interface BatchStatusDisplayProps {
  result: BatchResult;
}

export function BatchStatusDisplay({ result }: BatchStatusDisplayProps) {
  const { statistics, documents, status } = result;

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
          {documents.map((doc, index) => (
            <div
              key={doc.document_id}
              className={`flex items-center space-x-3 p-3 rounded-lg border ${getStatusColor(doc.status)}`}
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
            </div>
          ))}
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

