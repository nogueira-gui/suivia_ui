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
    line_count: number;
    word_count: number;
    extraction_timestamp: string;
  };
  error?: string;
}

export interface UploadProgress {
  step: 'idle' | 'requesting_url' | 'uploading' | 'processing' | 'completed' | 'error';
  message: string;
  progress: number;
  elapsedTime: number;
}
