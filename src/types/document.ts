export type DocumentStatus = 'PENDING_UPLOAD' | 'PROCESSING' | 'COMPLETED' | 'ERROR';

export interface UploadUrlResponse {
  document_id: string;
  upload_url: string;
  s3_key: string;
  content_type: string;
  expires_in: number;
  upload_method: string;
  instructions: string;
}

export interface ProcessResponse {
  document_id: string;
  status: DocumentStatus;
  job_id?: string;
}

export interface DocumentResult {
  document_id: string;
  status: DocumentStatus;
  source_s3_key: string;
  created_at: string;
  raw_text?: string;
  extracted?: {
    // Para documentos genéricos
    line_count?: number;
    word_count?: number;
    extraction_timestamp?: string;
    
    // Para notas fiscais
    document_type?: string;
    nota_fiscal?: NotaFiscalData;
    raw_expense_data?: RawExpenseData;
    
    // Quando há erro de validação
    error?: string;
  };
  error?: string;
}

export interface NotaFiscalData {
  nota_fiscal: {
    cabecalho: {
      numero?: string;
      serie?: string;
      chave_acesso?: string;
      data_emissao?: string;
      valor_total?: number;
      cnpj_emitente?: string;
      razao_social_emitente?: string;
      cnpj_destinatario?: string;
    };
    itens: Array<{
      descricao?: string;
      quantidade?: number;
      valor_unitario?: number;
      valor_total?: number;
    }>;
  };
  status?: string;
  confianca_extracao?: number;
  mensagens_validacao?: string[];
}

export interface RawExpenseData {
  summary_fields: {
    [key: string]: {
      value: string;
      confidence: number;
    };
  };
  line_items: any[];
  average_confidence?: number;
}

export interface UploadProgress {
  step: 'idle' | 'requesting_url' | 'uploading' | 'processing' | 'completed' | 'error';
  message: string;
  progress: number;
  elapsedTime: number;
}
