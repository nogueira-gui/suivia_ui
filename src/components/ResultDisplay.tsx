import { FileText, Copy, Download, CheckCircle, Receipt, AlertCircle, Building2, Calendar, DollarSign, Hash, Package } from 'lucide-react';
import { useState } from 'react';
import type { DocumentResult } from '../types/document';
import { DocumentService } from '../services/documentService';

interface ResultDisplayProps {
  result: DocumentResult;
}

export function ResultDisplay({ result }: ResultDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const rawText =
      result.raw_text ||
      result.rawText ||
      result.extracted?.raw_text ||
      result.extracted?.rawText;
    if (rawText) {
      await navigator.clipboard.writeText(rawText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const rawText =
      result.raw_text ||
      result.rawText ||
      result.extracted?.raw_text ||
      result.extracted?.rawText;
    const documentId = result.document_id || result.documentId || 'unknown';
    if (rawText) {
      const filename = `extracted_text_${documentId.slice(0, 8)}.txt`;
      DocumentService.downloadText(rawText, filename);
    }
  };

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
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const formatStatus = (status?: string) => {
    const statusMap: Record<string, { label: string; color: string; bgColor: string }> = {
      'VALIDADA': { label: 'Validada', color: 'text-green-700', bgColor: 'bg-green-100' },
      'PENDENTE_VALIDACAO': { label: 'Pendente de Validação', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
      'COM_DIVERGENCIA': { label: 'Com Divergência', color: 'text-orange-700', bgColor: 'bg-orange-100' },
      'REJEITADA': { label: 'Rejeitada', color: 'text-red-700', bgColor: 'bg-red-100' },
    };
    return statusMap[status || ''] || { label: status || 'Desconhecido', color: 'text-gray-700', bgColor: 'bg-gray-100' };
  };

  const renderReciboData = (recibo: any) => {
    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recibo.numero && (
            <div className="flex items-start space-x-3">
              <Hash className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Número do Recibo</p>
                <p className="text-sm font-medium text-gray-900">{recibo.numero}</p>
              </div>
            </div>
          )}

          {recibo.valor && (
            <div className="flex items-start space-x-3">
              <DollarSign className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Valor</p>
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(recibo.valor)}</p>
              </div>
            </div>
          )}

          {recibo.data_emissao && (
            <div className="flex items-start space-x-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Data de Emissão</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(recibo.data_emissao)}</p>
              </div>
            </div>
          )}

          {recibo.data_pagamento && (
            <div className="flex items-start space-x-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Data de Pagamento</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(recibo.data_pagamento)}</p>
              </div>
            </div>
          )}
        </div>

        {(recibo.pagador || recibo.beneficiario || recibo.profissional) && (
          <div className="pt-4 border-t space-y-3">
            <h6 className="font-medium text-gray-700 text-sm">Partes Envolvidas</h6>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recibo.pagador && (recibo.pagador.nome || recibo.pagador.cpf_cnpj) && (
                <div className="flex items-start space-x-3">
                  <Building2 className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Pagador</p>
                    <p className="text-sm font-medium text-gray-900">{recibo.pagador.nome || 'N/A'}</p>
                    {recibo.pagador.cpf_cnpj && (
                      <p className="text-xs text-gray-600 font-mono">
                        {recibo.pagador.cpf_cnpj.length === 11 
                          ? recibo.pagador.cpf_cnpj.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
                          : formatCNPJ(recibo.pagador.cpf_cnpj)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {recibo.beneficiario && (recibo.beneficiario.nome || recibo.beneficiario.cpf_cnpj) && (
                <div className="flex items-start space-x-3">
                  <Building2 className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Beneficiário</p>
                    <p className="text-sm font-medium text-gray-900">{recibo.beneficiario.nome || 'N/A'}</p>
                    {recibo.beneficiario.cpf_cnpj && (
                      <p className="text-xs text-gray-600 font-mono">
                        {recibo.beneficiario.cpf_cnpj.length === 11 
                          ? recibo.beneficiario.cpf_cnpj.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
                          : formatCNPJ(recibo.beneficiario.cpf_cnpj)}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {recibo.profissional && (recibo.profissional.nome || recibo.profissional.cpf) && (
                <div className="flex items-start space-x-3">
                  <Building2 className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Profissional</p>
                    <p className="text-sm font-medium text-gray-900">{recibo.profissional.nome || 'N/A'}</p>
                    {recibo.profissional.cpf && (
                      <p className="text-xs text-gray-600 font-mono">
                        {recibo.profissional.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                      </p>
                    )}
                    {recibo.profissional.registro_profissional && (
                      <p className="text-xs text-gray-500">Registro: {recibo.profissional.registro_profissional}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {recibo.descricao && (
          <div className="pt-4 border-t">
            <p className="text-xs text-gray-500 mb-1">Descrição</p>
            <p className="text-sm text-gray-900">{recibo.descricao}</p>
          </div>
        )}

        {recibo.observacoes && (
          <div className="pt-4 border-t">
            <p className="text-xs text-gray-500 mb-1">Observações</p>
            <p className="text-sm text-gray-700">{recibo.observacoes}</p>
          </div>
        )}
      </>
    );
  };

  const documentType = result.extracted?.document_type || 'generic';
  const isNotaFiscal = documentType === 'nota_fiscal';
  const isRecibo = documentType === 'recibo';
  const isContrato = documentType === 'contrato';
  const isBoleto = documentType === 'boleto';
  const isOrdemServico = documentType === 'ordem_servico';
  const hasError = !!result.extracted?.error;
  const notaFiscalData = result.extracted?.nota_fiscal;
  // Suporta ambos os formatos: snake_case e camelCase
  const extractionMethod = result.extraction_method || result.extractionMethod;
  const isDetectText = extractionMethod === 'detect_text';
  const rawText =
    result.raw_text ||
    result.rawText ||
    result.extracted?.raw_text ||
    result.extracted?.rawText;
  const documentId = result.document_id || result.documentId || 'unknown';

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
              {documentId}
            </p>
          </div>
          {documentType && documentType !== 'generic' && (
            <div>
              <p className="text-gray-600">Tipo de Documento</p>
              <p className="font-semibold text-gray-900 capitalize">
                {documentType.replace(/_/g, ' ')}
              </p>
            </div>
          )}
          {result.extracted && !isNotaFiscal && (
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
                  {result.extracted.extraction_timestamp && new Date(result.extracted.extraction_timestamp).toLocaleString('pt-BR')}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Se for detect_text, exibe apenas o raw_text */}
      {isDetectText && rawText && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-5 h-5 text-gray-600" />
              <h4 className="font-medium text-gray-900">Texto Extraído (Detect Text)</h4>
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
          <div className="p-6 bg-white">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
              {rawText}
            </pre>
          </div>
        </div>
      )}

      {/* Nota Fiscal Data - Structured (apenas se não for detect_text) */}
      {!isDetectText && isNotaFiscal && notaFiscalData && (
        <div className="border border-blue-200 bg-blue-50 rounded-lg overflow-hidden">
          <div className="bg-blue-100 border-b border-blue-200 p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Receipt className="w-5 h-5 text-blue-600" />
              <h4 className="font-medium text-blue-900">Nota Fiscal Eletrônica</h4>
            </div>
            {notaFiscalData.status && (
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${formatStatus(notaFiscalData.status).bgColor} ${formatStatus(notaFiscalData.status).color}`}>
                {formatStatus(notaFiscalData.status).label}
              </span>
            )}
          </div>

          <div className="p-6 bg-white space-y-6">
            {/* Cabeçalho */}
            {notaFiscalData.nota_fiscal?.cabecalho && (
              <div className="space-y-4">
                <h5 className="font-semibold text-gray-900 border-b pb-2">Informações da Nota</h5>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {notaFiscalData.nota_fiscal.cabecalho.numero && (
                    <div className="flex items-start space-x-3">
                      <Hash className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Número da Nota</p>
                        <p className="text-sm font-medium text-gray-900">{notaFiscalData.nota_fiscal.cabecalho.numero}</p>
                        {notaFiscalData.nota_fiscal.cabecalho.serie && (
                          <p className="text-xs text-gray-500">Série: {notaFiscalData.nota_fiscal.cabecalho.serie}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {notaFiscalData.nota_fiscal.cabecalho.data_emissao && (
                    <div className="flex items-start space-x-3">
                      <Calendar className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Data de Emissão</p>
                        <p className="text-sm font-medium text-gray-900">{formatDate(notaFiscalData.nota_fiscal.cabecalho.data_emissao)}</p>
                      </div>
                    </div>
                  )}

                  {notaFiscalData.nota_fiscal.cabecalho.valor_total && (
                    <div className="flex items-start space-x-3">
                      <DollarSign className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Valor Total</p>
                        <p className="text-lg font-semibold text-gray-900">{formatCurrency(notaFiscalData.nota_fiscal.cabecalho.valor_total)}</p>
                      </div>
                    </div>
                  )}

                  {notaFiscalData.nota_fiscal.cabecalho.tipo_nota && (
                    <div className="flex items-start space-x-3">
                      <Receipt className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs text-gray-500">Tipo</p>
                        <p className="text-sm font-medium text-gray-900">
                          {notaFiscalData.nota_fiscal.cabecalho.tipo_nota === 'ENTRADA' ? 'Entrada' : 'Saída'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* CNPJs */}
                {(notaFiscalData.nota_fiscal.cabecalho.cnpj_emitente || notaFiscalData.nota_fiscal.cabecalho.cnpj_destinatario) && (
                  <div className="pt-4 border-t space-y-3">
                    <h6 className="font-medium text-gray-700 text-sm">Emitente e Destinatário</h6>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {notaFiscalData.nota_fiscal.cabecalho.cnpj_emitente && (
                        <div className="flex items-start space-x-3">
                          <Building2 className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs text-gray-500">Emitente</p>
                            <p className="text-sm font-medium text-gray-900">
                              {notaFiscalData.nota_fiscal.cabecalho.razao_social_emitente || 'N/A'}
                            </p>
                            <p className="text-xs text-gray-600 font-mono">{formatCNPJ(notaFiscalData.nota_fiscal.cabecalho.cnpj_emitente)}</p>
                          </div>
                        </div>
                      )}

                      {notaFiscalData.nota_fiscal.cabecalho.cnpj_destinatario && notaFiscalData.nota_fiscal.cabecalho.cnpj_destinatario !== '00000000000000' && (
                        <div className="flex items-start space-x-3">
                          <Building2 className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs text-gray-500">Destinatário</p>
                            <p className="text-sm font-medium text-gray-900">
                              {notaFiscalData.nota_fiscal.cabecalho.razao_social_destinatario || 'N/A'}
                            </p>
                            <p className="text-xs text-gray-600 font-mono">{formatCNPJ(notaFiscalData.nota_fiscal.cabecalho.cnpj_destinatario)}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Chave de Acesso */}
                {notaFiscalData.nota_fiscal.cabecalho.chave_acesso && 
                 notaFiscalData.nota_fiscal.cabecalho.chave_acesso !== '00000000000000000000000000000000000000000000' && (
                  <div className="pt-4 border-t">
                    <p className="text-xs text-gray-500 mb-1">Chave de Acesso</p>
                    <p className="text-xs font-mono text-gray-700 break-all">
                      {notaFiscalData.nota_fiscal.cabecalho.chave_acesso.match(/.{1,4}/g)?.join(' ') || notaFiscalData.nota_fiscal.cabecalho.chave_acesso}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Itens */}
            {notaFiscalData.nota_fiscal?.itens && notaFiscalData.nota_fiscal.itens.length > 0 && (
              <div className="pt-4 border-t">
                <div className="flex items-center space-x-2 mb-4">
                  <Package className="w-5 h-5 text-gray-400" />
                  <h5 className="font-semibold text-gray-900">Itens da Nota ({notaFiscalData.nota_fiscal.itens.length})</h5>
                </div>
                <div className="space-y-3">
                  {notaFiscalData.nota_fiscal.itens.map((item, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 mb-1">Item {item.numero_item || idx + 1}</p>
                          <p className="text-sm font-medium text-gray-900">{item.descricao || 'Item sem descrição'}</p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-sm font-semibold text-gray-900">{formatCurrency(item.valor_total)}</p>
                          {item.quantidade && item.valor_unitario && (
                            <p className="text-xs text-gray-500">
                              {item.quantidade} x {formatCurrency(item.valor_unitario)}
                            </p>
                          )}
                        </div>
                      </div>
                      {item.codigo_produto && (
                        <p className="text-xs text-gray-500 font-mono">Código: {item.codigo_produto}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Metadados */}
            <div className="pt-4 border-t">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {notaFiscalData.confianca_extracao !== undefined && (
                  <div>
                    <p className="text-xs text-gray-500">Confiança da Extração</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {notaFiscalData.confianca_extracao.toFixed(1)}%
                    </p>
                  </div>
                )}
                {notaFiscalData.campos_extraidos && notaFiscalData.campos_esperados && (
                  <div>
                    <p className="text-xs text-gray-500">Campos Extraídos</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {notaFiscalData.campos_extraidos} / {notaFiscalData.campos_esperados}
                    </p>
                  </div>
                )}
              </div>
              {notaFiscalData.mensagens_validacao && notaFiscalData.mensagens_validacao.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gray-500 mb-2">Mensagens de Validação:</p>
                  <ul className="space-y-1">
                    {notaFiscalData.mensagens_validacao.map((msg, idx) => (
                      <li key={idx} className="text-xs text-gray-600">• {msg}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recibo Data - Structured */}
      {/* Mostra recibo estruturado mesmo se for detect_text, desde que tenha dados estruturados */}
      {isRecibo && result.extracted?.recibo && (
        <div className="border border-green-200 bg-green-50 rounded-lg overflow-hidden">
          <div className="bg-green-100 border-b border-green-200 p-4 flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-green-600" />
            <h4 className="font-medium text-green-900">Recibo</h4>
          </div>
          <div className="p-6 bg-white space-y-6">
            {renderReciboData(result.extracted.recibo)}
          </div>
        </div>
      )}

      {/* Nota Fiscal Data - Raw (fallback) - apenas se não for detect_text */}
      {!isDetectText && isNotaFiscal && result.extracted?.raw_expense_data && !notaFiscalData && (
        <div className="border border-blue-200 bg-blue-50 rounded-lg overflow-hidden">
          <div className="bg-blue-100 border-b border-blue-200 p-4 flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            <h4 className="font-medium text-blue-900">Dados da Nota Fiscal (Brutos)</h4>
          </div>
          <div className="p-4 bg-white space-y-3">
            {Object.entries(result.extracted.raw_expense_data.summary_fields).map(([key, field]) => (
              <div key={key} className="flex justify-between items-start">
                <span className="text-sm font-medium text-gray-600">{key}:</span>
                <div className="text-right">
                  <span className="text-sm text-gray-900">{field.value}</span>
                  <span className="ml-2 text-xs text-gray-500">({field.confidence.toFixed(1)}%)</span>
                </div>
              </div>
            ))}
            {result.extracted.raw_expense_data.average_confidence && (
              <div className="pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-600">
                  Confiança média: <span className="font-semibold">{result.extracted.raw_expense_data.average_confidence}%</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Display */}
      {hasError && (
        <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-orange-900 mb-1">Aviso de Validação</h4>
              <p className="text-sm text-orange-800">{result.extracted?.error}</p>
              <p className="text-xs text-orange-700 mt-2">
                Os dados brutos foram extraídos e estão disponíveis acima.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Texto Extraído (apenas se não for detect_text, pois já foi exibido acima) */}
      {!isDetectText && rawText && (
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
              {rawText}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
