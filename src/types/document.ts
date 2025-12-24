export type DocumentStatus = 'PENDING_UPLOAD' | 'PROCESSING' | 'COMPLETED' | 'ERROR';

export interface UploadUrlResponse {
  document_id?: string;
  documentId?: string;
  upload_url?: string;
  uploadUrl?: string;
  s3_key?: string;
  s3Key?: string;
  content_type?: string;
  contentType?: string;
  expires_in?: number;
  expiresIn?: number;
  upload_method?: string;
  uploadMethod?: string;
  instructions?: string;
}

export interface ProcessResponse {
  document_id?: string;
  documentId?: string;
  status: DocumentStatus;
  job_id?: string;
  jobId?: string;
}

export interface DocumentResult {
  document_id?: string;
  documentId?: string;
  status: DocumentStatus;
  source_s3_key?: string;
  sourceS3Key?: string;
  created_at?: string;
  createdAt?: string;
  raw_text?: string;
  rawText?: string;
  extraction_method?: string;
  extractionMethod?: string;
  extracted?: {
    // Para documentos genéricos
    line_count?: number;
    word_count?: number;
    extraction_timestamp?: string;
    raw_text?: string;
    rawText?: string;
    
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
      tipo_nota?: string;
      razao_social_destinatario?: string;
    };
    itens: Array<{
      numero_item?: number;
      descricao?: string;
      quantidade?: number;
      valor_unitario?: number;
      valor_total?: number;
      codigo_produto?: string;
    }>;
  };
  status?: string;
  confianca_extracao?: number;
  mensagens_validacao?: string[];
  campos_extraidos?: number;
  campos_esperados?: number;
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
