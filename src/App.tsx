import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  ClipboardCheck,
  Database,
  Download,
  Eye,
  FileJson,
  FileSearch,
  FileText,
  Filter,
  ListChecks,
  Plus,
  RefreshCw,
  Search,
  Upload,
} from 'lucide-react';
import { BatchStatusDisplay } from './components/BatchStatusDisplay';
import { FileUploader } from './components/FileUploader';
import { ProgressIndicator } from './components/ProgressIndicator';
import { ResultDisplay } from './components/ResultDisplay';
import { useBatchUpload } from './hooks/useBatchUpload';
import { useDocumentUpload } from './hooks/useDocumentUpload';
import { BatchService } from './services/batchService';
import { DocumentService } from './services/documentService';
import type { BatchListItem, DocumentResult, DocumentStatus } from './types/document';

type ExtractionMethod = 'detect_text' | 'analyze_document' | 'analyze_expense';
type DocumentType =
  | 'nota_fiscal'
  | 'recibo'
  | 'informe_rendimento'
  | 'matricula_imovel'
  | 'documento_pessoal'
  | 'contrato'
  | 'boleto'
  | 'ordem_servico'
  | 'generic'
  | '';
type View = 'documents' | 'review' | 'upload' | 'batches';

const statusOptions: Array<DocumentStatus | 'ALL'> = [
  'ALL',
  'PENDING_UPLOAD',
  'PROCESSING',
  'COMPLETED',
  'LOW_CONFIDENCE',
  'NEEDS_REVIEW',
  'ERROR',
];

const documentTypes: Array<{ value: DocumentType; label: string }> = [
  { value: '', label: 'Auto / nao informado' },
  { value: 'nota_fiscal', label: 'Nota fiscal' },
  { value: 'recibo', label: 'Recibo' },
  { value: 'informe_rendimento', label: 'Informe de rendimento' },
  { value: 'matricula_imovel', label: 'Matricula de imovel' },
  { value: 'documento_pessoal', label: 'Documento pessoal' },
  { value: 'contrato', label: 'Contrato' },
  { value: 'boleto', label: 'Boleto' },
  { value: 'ordem_servico', label: 'Ordem de servico' },
  { value: 'generic', label: 'Generico' },
];

const extractionMethods: Array<{ value: ExtractionMethod; label: string }> = [
  { value: 'detect_text', label: 'detect_text' },
  { value: 'analyze_document', label: 'analyze_document' },
  { value: 'analyze_expense', label: 'analyze_expense' },
];

function App() {
  const [view, setView] = useState<View>('documents');
  const [documents, setDocuments] = useState<DocumentResult[]>([]);
  const [reviewQueue, setReviewQueue] = useState<DocumentResult[]>([]);
  const [batches, setBatches] = useState<BatchListItem[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<DocumentResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<DocumentType>('');
  const [query, setQuery] = useState('');
  const [uploadMode, setUploadMode] = useState<'single' | 'batch'>('single');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [extractionMethod, setExtractionMethod] = useState<ExtractionMethod>('analyze_document');
  const [documentType, setDocumentType] = useState<DocumentType>('');
  const [useLlm, setUseLlm] = useState(false);
  const [reprocessMethod, setReprocessMethod] = useState<ExtractionMethod>('analyze_document');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const {
    progress,
    result,
    error,
    isUploading,
    uploadDocument,
    reprocessDocument: legacyReprocessDocument,
    reset,
  } = useDocumentUpload();
  const {
    progress: batchProgress,
    result: batchResult,
    error: batchError,
    isUploading: isBatchUploading,
    uploadBatch,
    reset: resetBatch,
  } = useBatchUpload();

  const fetchOperationalData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [documentResponse, reviewResponse, batchResponse] = await Promise.allSettled([
        DocumentService.listDocuments({ status: statusFilter, limit: 80 }),
        DocumentService.listWorkQueue({ limit: 80 }),
        BatchService.listBatches(20),
      ]);

      if (documentResponse.status === 'fulfilled') {
        setDocuments(documentResponse.value.items || []);
      }

      if (reviewResponse.status === 'fulfilled') {
        setReviewQueue(reviewResponse.value.items || []);
      }

      if (batchResponse.status === 'fulfilled') {
        setBatches(batchResponse.value.batches || []);
      }

      const rejected = [documentResponse, reviewResponse, batchResponse].find((response) => response.status === 'rejected');
      if (rejected && rejected.status === 'rejected') {
        setLoadError(rejected.reason instanceof Error ? rejected.reason.message : 'Falha ao carregar dados operacionais');
      }
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void fetchOperationalData();
  }, [fetchOperationalData]);

  useEffect(() => {
    if (result) {
      setSelectedDocument(result);
      setView('documents');
      void fetchOperationalData();
    }
  }, [fetchOperationalData, result]);

  useEffect(() => {
    if (batchResult) {
      setView('batches');
      void fetchOperationalData();
    }
  }, [batchResult, fetchOperationalData]);

  const filteredDocuments = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return documents.filter((document) => {
      const statusMatches = statusFilter === 'ALL' || document.status === statusFilter;
      const typeMatches = !typeFilter || getDocumentType(document) === typeFilter;
      const textMatches =
        !needle ||
        [
          getDocumentId(document),
          getDocumentType(document),
          getS3Key(document),
          document.batch_id,
          document.batchId,
          document.file_hash,
          document.fileHash,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle));

      return statusMatches && typeMatches && textMatches;
    });
  }, [documents, query, statusFilter, typeFilter]);

  const counters = useMemo(() => {
    return {
      total: documents.length,
      processing: documents.filter((document) => document.status === 'PROCESSING').length,
      review: documents.filter((document) => isReviewStatus(document.status)).length,
      error: documents.filter((document) => document.status === 'ERROR').length,
    };
  }, [documents]);

  const currentProgress = uploadMode === 'batch' ? batchProgress : progress;
  const currentError = uploadMode === 'batch' ? batchError : error;
  const isProcessing = uploadMode === 'batch' ? isBatchUploading : isUploading;

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setSelectedFiles([file]);
  };

  const handleFilesSelect = (files: File[]) => {
    setSelectedFiles(files);
    setSelectedFile(files.length === 1 ? files[0] : null);
  };

  const handleUpload = async () => {
    setActionMessage(null);
    if (uploadMode === 'batch' && selectedFiles.length > 0) {
      await uploadBatch(selectedFiles, extractionMethod, documentType || undefined);
    } else if (selectedFile) {
      await uploadDocument(selectedFile, extractionMethod, documentType || undefined, useLlm);
    }
  };

  const handleResetUpload = () => {
    setSelectedFile(null);
    setSelectedFiles([]);
    setDocumentType('');
    setUseLlm(false);
    reset();
    resetBatch();
  };

  const handleSelectDocument = async (document: DocumentResult) => {
    const documentId = getDocumentId(document);
    setSelectedDocument(document);
    if (!documentId) {
      return;
    }

    try {
      const fullDocument = await DocumentService.getDocumentStatus(documentId);
      setSelectedDocument(fullDocument);
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Nao foi possivel abrir o documento');
    }
  };

  const handleReprocessSelected = async () => {
    const documentId = selectedDocument ? getDocumentId(selectedDocument) : '';
    if (!documentId) {
      return;
    }

    setActionMessage('Reprocessamento solicitado');
    try {
      await DocumentService.reprocessDocument(documentId, reprocessMethod);
      const refreshed = await DocumentService.getDocumentStatus(documentId);
      setSelectedDocument(refreshed);
      await fetchOperationalData();
      setActionMessage('Documento enviado para reprocessamento');
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Falha ao reprocessar documento');
    }
  };

  const handleExportDocuments = () => {
    DocumentService.downloadCsv(
      filteredDocuments.map((document) => ({
        document_id: getDocumentId(document),
        status: document.status,
        document_type: getDocumentType(document),
        extraction_method: getExtractionMethod(document),
        created_at: document.created_at || document.createdAt,
        updated_at: document.updated_at || document.updatedAt,
      })),
      'suivia-documentos.csv'
    );
  };

  const handleExportJson = () => {
    if (selectedDocument) {
      DocumentService.downloadJson(selectedDocument, `suivia-documento-${getDocumentId(selectedDocument) || 'detalhe'}.json`);
    }
  };

  const navItems: Array<{ id: View; label: string; icon: typeof FileText }> = [
    { id: 'documents', label: 'Documentos', icon: FileSearch },
    { id: 'review', label: 'Revisao', icon: ClipboardCheck },
    { id: 'upload', label: 'Upload', icon: Upload },
    { id: 'batches', label: 'Lotes', icon: ListChecks },
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <FileText className="h-7 w-7 text-sky-700" aria-hidden="true" />
              <h1 className="text-2xl font-semibold tracking-normal">Suivia Documentos</h1>
            </div>
            <p className="mt-1 text-sm text-slate-600">Console operacional para OCR, status, revisao e lotes.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 lg:justify-end">
            <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1">
              <Database className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              dev Lambda API
            </span>
            <span className="max-w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1">
              <span className="hidden sm:inline">Textract: </span>detect_text / analyze_document / analyze_expense
            </span>
            <button
              type="button"
              onClick={() => void fetchOperationalData()}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
              Atualizar
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="h-fit rounded-lg border border-slate-200 bg-white p-2">
          <nav className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-1" aria-label="Navegacao principal">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setView(item.id)}
                  className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium lg:justify-start ${
                    view === item.id ? 'bg-sky-700 text-white' : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="space-y-4">
          <StatusSummary counters={counters} reviewCount={reviewQueue.length} />

          {(loadError || actionMessage) && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {loadError || actionMessage}
            </div>
          )}

          {view === 'documents' && (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
              <div className="rounded-lg border border-slate-200 bg-white">
                <Toolbar
                  query={query}
                  statusFilter={statusFilter}
                  typeFilter={typeFilter}
                  onQueryChange={setQuery}
                  onStatusChange={setStatusFilter}
                  onTypeChange={setTypeFilter}
                  onExport={handleExportDocuments}
                />
                <DocumentTable
                  documents={filteredDocuments}
                  selectedDocumentId={selectedDocument ? getDocumentId(selectedDocument) : ''}
                  onSelect={(document) => void handleSelectDocument(document)}
                  onUpload={() => setView('upload')}
                />
              </div>
              <DocumentDetail
                document={selectedDocument}
                reprocessMethod={reprocessMethod}
                onReprocessMethodChange={setReprocessMethod}
                onReprocess={() => void handleReprocessSelected()}
                onExportJson={handleExportJson}
              />
            </div>
          )}

          {view === 'review' && (
            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="text-base font-semibold">Fila de revisao humana</h2>
                <p className="text-sm text-slate-600">LOW_CONFIDENCE e NEEDS_REVIEW ficam visiveis para triagem.</p>
              </div>
              <DocumentTable
                documents={reviewQueue}
                selectedDocumentId={selectedDocument ? getDocumentId(selectedDocument) : ''}
                onSelect={(document) => {
                  void handleSelectDocument(document);
                  setView('documents');
                }}
                onUpload={() => setView('upload')}
              />
            </div>
          )}

          {view === 'upload' && (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
              <UploadPanel
                mode={uploadMode}
                documentType={documentType}
                extractionMethod={extractionMethod}
                useLlm={useLlm}
                isProcessing={isProcessing}
                selectedFile={selectedFile}
                selectedFiles={selectedFiles}
                onModeChange={(nextMode) => {
                  setUploadMode(nextMode);
                  handleResetUpload();
                }}
                onDocumentTypeChange={setDocumentType}
                onExtractionMethodChange={setExtractionMethod}
                onUseLlmChange={setUseLlm}
                onFileSelect={handleFileSelect}
                onFilesSelect={handleFilesSelect}
                onUpload={() => void handleUpload()}
              />
              <div className="space-y-4">
                <ProgressIndicator progress={currentProgress} />
                {currentError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{currentError}</div>
                )}
                {result && <ResultDisplay result={result} onReprocess={legacyReprocessDocument} />}
                {batchResult && <BatchStatusDisplay result={batchResult} />}
              </div>
            </div>
          )}

          {view === 'batches' && (
            <div className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-4 py-3">
                <h2 className="text-base font-semibold">Lotes recentes</h2>
                <p className="text-sm text-slate-600">Acompanhamento de processamento em lote e exportacao futura.</p>
              </div>
              <BatchList batches={batches} />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatusSummary({
  counters,
  reviewCount,
}: {
  counters: { total: number; processing: number; review: number; error: number };
  reviewCount: number;
}) {
  const items = [
    { label: 'Documentos', value: counters.total, icon: BarChart3, tone: 'text-slate-900' },
    { label: 'PROCESSING', value: counters.processing, icon: RefreshCw, tone: 'text-sky-700' },
    { label: 'LOW_CONFIDENCE / NEEDS_REVIEW', value: Math.max(counters.review, reviewCount), icon: ClipboardCheck, tone: 'text-amber-700' },
    { label: 'ERROR', value: counters.error, icon: AlertTriangle, tone: 'text-red-700' },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-3 sm:p-4">
            <div className="flex items-center justify-between gap-3">
              <span className="min-w-0 text-xs font-medium uppercase leading-snug text-slate-500">{item.label}</span>
              <Icon className={`h-4 w-4 ${item.tone}`} aria-hidden="true" />
            </div>
            <p className={`mt-2 text-xl font-semibold sm:text-2xl ${item.tone}`}>{item.value}</p>
          </div>
        );
      })}
    </div>
  );
}

function Toolbar({
  query,
  statusFilter,
  typeFilter,
  onQueryChange,
  onStatusChange,
  onTypeChange,
  onExport,
}: {
  query: string;
  statusFilter: DocumentStatus | 'ALL';
  typeFilter: DocumentType;
  onQueryChange: (value: string) => void;
  onStatusChange: (value: DocumentStatus | 'ALL') => void;
  onTypeChange: (value: DocumentType) => void;
  onExport: () => void;
}) {
  return (
    <div className="grid gap-3 border-b border-slate-200 p-4 lg:grid-cols-[minmax(180px,1fr)_170px_220px_auto]">
      <label className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          className="h-10 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
          placeholder="Buscar por id, arquivo, lote ou hash"
        />
      </label>
      <label className="relative">
        <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <select
          value={statusFilter}
          onChange={(event) => onStatusChange(event.target.value as DocumentStatus | 'ALL')}
          className="h-10 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      </label>
      <select
        value={typeFilter}
        onChange={(event) => onTypeChange(event.target.value as DocumentType)}
        className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
      >
        {documentTypes.map((type) => (
          <option key={type.value || 'auto'} value={type.value}>
            {type.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={onExport}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        CSV
      </button>
    </div>
  );
}

function DocumentTable({
  documents,
  selectedDocumentId,
  onSelect,
  onUpload,
}: {
  documents: DocumentResult[];
  selectedDocumentId: string;
  onSelect: (document: DocumentResult) => void;
  onUpload: () => void;
}) {
  if (documents.length === 0) {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="rounded-full bg-slate-100 p-3">
          <FileSearch className="h-6 w-6 text-slate-500" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Nenhum documento encontrado</h3>
          <p className="mt-1 max-w-sm text-sm text-slate-600">
            Envie um documento ou altere os filtros para acompanhar status, revisao e extracao.
          </p>
        </div>
        <button
          type="button"
          onClick={onUpload}
          className="inline-flex items-center gap-2 rounded-md bg-sky-700 px-3 py-2 text-sm font-medium text-white hover:bg-sky-800"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Novo upload
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Documento</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Tipo</th>
            <th className="px-4 py-3 font-medium">Textract</th>
            <th className="px-4 py-3 font-medium">Criado</th>
            <th className="px-4 py-3 font-medium">Acao</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {documents.map((document) => {
            const documentId = getDocumentId(document);
            const selected = selectedDocumentId === documentId;
            return (
              <tr key={documentId || getS3Key(document)} className={selected ? 'bg-sky-50' : undefined}>
                <td className="max-w-[280px] px-4 py-3">
                  <p className="truncate font-mono text-xs text-slate-900">{documentId || 'sem id'}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{getS3Key(document) || document.file_hash || 'sem origem'}</p>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={document.status} />
                </td>
                <td className="px-4 py-3 text-slate-700">{formatDocumentType(getDocumentType(document))}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600">{getExtractionMethod(document) || '-'}</td>
                <td className="px-4 py-3 text-slate-600">{formatDate(document.created_at || document.createdAt)}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => onSelect(document)}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    Abrir
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DocumentDetail({
  document,
  reprocessMethod,
  onReprocessMethodChange,
  onReprocess,
  onExportJson,
}: {
  document: DocumentResult | null;
  reprocessMethod: ExtractionMethod;
  onReprocessMethodChange: (value: ExtractionMethod) => void;
  onReprocess: () => void;
  onExportJson: () => void;
}) {
  if (!document) {
    return (
      <aside className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-base font-semibold">Detalhe do documento</h2>
        <p className="mt-2 text-sm text-slate-600">Selecione um documento para ver campos, texto bruto, JSON e acoes.</p>
      </aside>
    );
  }

  const rawText = document.raw_text || document.rawText || document.extracted?.raw_text || document.extracted?.rawText || '';
  const fields = flattenFields(document.extracted);

  return (
    <aside className="space-y-4 rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Detalhe do documento</h2>
          <p className="mt-1 break-all font-mono text-xs text-slate-500">{getDocumentId(document)}</p>
        </div>
        <StatusBadge status={document.status} />
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Meta label="Tipo" value={formatDocumentType(getDocumentType(document))} />
        <Meta label="Metodo" value={getExtractionMethod(document) || '-'} />
        <Meta label="Operacao" value={document.textract_operation || document.textractOperation || '-'} />
        <Meta label="Batch" value={document.batch_id || document.batchId || '-'} />
      </dl>

      <div className="rounded-lg border border-slate-200">
        <div className="border-b border-slate-200 px-3 py-2 text-sm font-medium">Campos extraidos</div>
        <div className="max-h-56 overflow-auto p-3">
          {fields.length > 0 ? (
            <div className="space-y-2">
              {fields.slice(0, 16).map(([key, value]) => (
                <div key={key} className="grid grid-cols-[120px_minmax(0,1fr)] gap-2 text-xs">
                  <span className="font-medium text-slate-500">{key}</span>
                  <span className="break-words text-slate-900">{String(value)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Sem campos estruturados disponiveis.</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200">
        <div className="border-b border-slate-200 px-3 py-2 text-sm font-medium">Texto bruto</div>
        <pre className="max-h-44 overflow-auto whitespace-pre-wrap p-3 text-xs text-slate-700">
          {rawText || 'Texto bruto ainda nao disponivel.'}
        </pre>
      </div>

      <div className="rounded-lg border border-slate-200">
        <div className="border-b border-slate-200 px-3 py-2 text-sm font-medium">JSON</div>
        <pre className="max-h-56 overflow-auto p-3 text-xs text-slate-700">{JSON.stringify(document, null, 2)}</pre>
      </div>

      <div className="grid gap-2">
        <label className="text-xs font-medium uppercase text-slate-500" htmlFor="reprocess-method">
          Reprocessar com
        </label>
        <select
          id="reprocess-method"
          value={reprocessMethod}
          onChange={(event) => onReprocessMethodChange(event.target.value as ExtractionMethod)}
          className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
        >
          {extractionMethods.map((method) => (
            <option key={method.value} value={method.value}>
              {method.label}
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onReprocess}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-sky-700 px-3 py-2 text-sm font-medium text-white hover:bg-sky-800"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Reprocessar
          </button>
          <button
            type="button"
            onClick={onExportJson}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <FileJson className="h-4 w-4" aria-hidden="true" />
            JSON
          </button>
        </div>
      </div>
    </aside>
  );
}

function UploadPanel({
  mode,
  documentType,
  extractionMethod,
  useLlm,
  isProcessing,
  selectedFile,
  selectedFiles,
  onModeChange,
  onDocumentTypeChange,
  onExtractionMethodChange,
  onUseLlmChange,
  onFileSelect,
  onFilesSelect,
  onUpload,
}: {
  mode: 'single' | 'batch';
  documentType: DocumentType;
  extractionMethod: ExtractionMethod;
  useLlm: boolean;
  isProcessing: boolean;
  selectedFile: File | null;
  selectedFiles: File[];
  onModeChange: (value: 'single' | 'batch') => void;
  onDocumentTypeChange: (value: DocumentType) => void;
  onExtractionMethodChange: (value: ExtractionMethod) => void;
  onUseLlmChange: (value: boolean) => void;
  onFileSelect: (file: File) => void;
  onFilesSelect: (files: File[]) => void;
  onUpload: () => void;
}) {
  const canUpload = (mode === 'single' && selectedFile) || (mode === 'batch' && selectedFiles.length > 0);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold">Upload e processamento</h2>
        <p className="mt-1 text-sm text-slate-600">Envie documentos para Textract com tipo e metodo definidos.</p>
      </div>

      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onModeChange('single')}
            disabled={isProcessing}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              mode === 'single' ? 'bg-sky-700 text-white' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Upload unico
          </button>
          <button
            type="button"
            onClick={() => onModeChange('batch')}
            disabled={isProcessing}
            className={`rounded-md px-3 py-2 text-sm font-medium ${
              mode === 'batch' ? 'bg-sky-700 text-white' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Upload em lote
          </button>
        </div>

        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700">Tipo de documento</span>
          <select
            value={documentType}
            onChange={(event) => onDocumentTypeChange(event.target.value as DocumentType)}
            disabled={isProcessing}
            className="h-10 rounded-md border border-slate-300 px-3 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
          >
            {documentTypes.map((type) => (
              <option key={type.value || 'auto'} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm">
          <span className="font-medium text-slate-700">Metodo de extracao Textract</span>
          <select
            value={extractionMethod}
            onChange={(event) => onExtractionMethodChange(event.target.value as ExtractionMethod)}
            disabled={isProcessing}
            className="h-10 rounded-md border border-slate-300 px-3 outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
          >
            {extractionMethods.map((method) => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
          <input
            type="checkbox"
            checked={useLlm}
            onChange={(event) => onUseLlmChange(event.target.checked)}
            disabled={isProcessing}
            className="h-4 w-4 rounded border-slate-300 text-sky-700 focus:ring-sky-600"
          />
          Usar LLM quando a politica permitir reconciliacao
        </label>

        <FileUploader
          onFileSelect={onFileSelect}
          onFilesSelect={onFilesSelect}
          disabled={isProcessing}
          multiple={mode === 'batch'}
        />

        {canUpload && (
          <button
            type="button"
            onClick={onUpload}
            disabled={isProcessing}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-sky-700 px-4 text-sm font-medium text-white hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            {mode === 'batch' ? `Processar ${selectedFiles.length} arquivos` : 'Processar documento'}
          </button>
        )}
      </div>
    </div>
  );
}

function BatchList({ batches }: { batches: BatchListItem[] }) {
  if (batches.length === 0) {
    return <div className="p-8 text-center text-sm text-slate-600">Nenhum lote recente encontrado.</div>;
  }

  return (
    <div className="divide-y divide-slate-100">
      {batches.map((batch) => (
        <div key={batch.batch_id} className="grid gap-3 px-4 py-3 text-sm lg:grid-cols-[minmax(0,1fr)_140px_120px_160px]">
          <div>
            <p className="font-mono text-xs text-slate-900">{batch.batch_id}</p>
            <p className="mt-1 text-xs text-slate-500">{formatDate(batch.created_at)}</p>
          </div>
          <StatusBadge status={batch.status as DocumentStatus} />
          <p className="text-slate-700">{batch.total_documents ?? 0} documentos</p>
          <p className="text-slate-600">
            {batch.completed_documents ?? 0} ok / {batch.error_documents ?? 0} erro
          </p>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === 'COMPLETED'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : status === 'LOW_CONFIDENCE'
        ? 'border-amber-200 bg-amber-50 text-amber-700'
        : status === 'NEEDS_REVIEW'
          ? 'border-orange-200 bg-orange-50 text-orange-700'
          : status === 'ERROR'
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-sky-200 bg-sky-50 text-sky-700';

  return <span className={`inline-flex w-fit rounded-md border px-2 py-1 text-xs font-medium ${className}`}>{status}</span>;
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-slate-900">{value}</dd>
    </div>
  );
}

function getDocumentId(document: DocumentResult): string {
  return document.document_id || document.documentId || '';
}

function getDocumentType(document: DocumentResult): string {
  return document.document_type || document.documentType || document.extracted?.document_type || 'generic';
}

function getExtractionMethod(document: DocumentResult): string {
  return document.extraction_method || document.extractionMethod || '';
}

function getS3Key(document: DocumentResult): string {
  return document.source_s3_key || document.sourceS3Key || '';
}

function formatDocumentType(value: string): string {
  return value ? value.replace(/_/g, ' ') : '-';
}

function formatDate(value?: string): string {
  if (!value) {
    return '-';
  }

  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function isReviewStatus(status: string): boolean {
  return status === 'LOW_CONFIDENCE' || status === 'NEEDS_REVIEW';
}

function flattenFields(value: unknown, prefix = ''): Array<[string, string | number | boolean]> {
  if (!value || typeof value !== 'object') {
    return [];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, nestedValue]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;
    if (nestedValue === null || nestedValue === undefined) {
      return [];
    }
    if (['string', 'number', 'boolean'].includes(typeof nestedValue)) {
      return [[nextKey, nestedValue as string | number | boolean]];
    }
    if (Array.isArray(nestedValue)) {
      return nestedValue.length ? [[nextKey, `${nestedValue.length} item(ns)`]] : [];
    }
    return flattenFields(nestedValue, nextKey);
  });
}

export default App;
