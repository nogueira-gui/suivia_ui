# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [2.0.0] - 2025-11-03

### 🎉 Adicionado

- **Sistema de Polling Ativo**: Implementado polling automático para verificar status de processamento
  - Novo método `checkDocumentStatus()` que utiliza endpoint `POST /documents/{id}/check-status`
  - Polling a cada 5 segundos
  - Timeout de 10 minutos (120 tentativas)
  - Retry automático em caso de erros temporários

- **Feedback Visual Aprimorado**:
  - Contador de tentativas de polling
  - Tempo decorrido formatado (Xm Ys)
  - Progresso baseado em tempo real
  - Mensagens contextuais durante processamento

- **Documentação**:
  - `POLLING_IMPLEMENTATION.md`: Documentação técnica completa
  - `RESUMO_POLLING.md`: Resumo executivo das mudanças
  - `TEST_POLLING.md`: Guia completo de testes
  - `CHANGELOG.md`: Histórico de mudanças

### 🔄 Modificado

- **documentService.ts**:
  - `pollDocumentStatus()` agora usa o novo endpoint de check-status
  - Callback do polling agora recebe `attempt` e `elapsed` como parâmetros
  - Timeout aumentado de 5 para 10 minutos
  - Mensagens de erro mais descritivas
  - Tratamento robusto de erros com retry

- **useDocumentUpload.ts**:
  - Callback do polling atualizado para usar novos parâmetros
  - Cálculo de progresso baseado em tempo decorrido
  - Mensagens mais informativas com tentativa e tempo

- **App.tsx**:
  - Tempo estimado atualizado: "30 segundos a 3 minutos"
  - Informação sobre intervalo de polling adicionada

### 🐛 Corrigido

- Warning de variável não utilizada em `useDocumentUpload.ts`
- Estimativas de tempo agora refletem a realidade (30s - 3min)

### ⚡ Performance

- Polling otimizado: intervalo de 5 segundos (anteriormente variável)
- Timeout mais generoso: 10 minutos para documentos complexos
- Retry inteligente em caso de falhas de rede

### 🔒 Segurança

- Validação robusta de status de documentos
- Tratamento adequado de timeouts
- Limpeza de timers e recursos

## [1.0.0] - 2025-10-XX

### 🎉 Adicionado

- Sistema de upload de documentos PDF
- Processamento OCR com AWS Textract
- Extração de texto de documentos
- Interface visual com React + TypeScript + Tailwind CSS
- Componentes:
  - `FileUploader`: Upload de arquivos com validação
  - `ProgressIndicator`: Indicador visual de progresso
  - `ResultDisplay`: Exibição de resultados com opções de copiar/baixar
- Hook customizado `useDocumentUpload` para gerenciar estado
- Serviço `documentService` para comunicação com API
- Suporte a arquivos até 100MB
- Validação de tipo de arquivo (apenas PDF)

### 🔧 Técnico

- Framework: Vite + React 18
- Linguagem: TypeScript
- Estilo: Tailwind CSS
- Ícones: Lucide React
- Build: ESLint + TypeScript Compiler

---

## Tipos de Mudanças

- `🎉 Adicionado` para novas funcionalidades
- `🔄 Modificado` para mudanças em funcionalidades existentes
- `🗑️ Removido` para funcionalidades removidas
- `🐛 Corrigido` para correção de bugs
- `⚡ Performance` para melhorias de performance
- `🔒 Segurança` para correções de vulnerabilidades

---

## Links Úteis

- [Documentação Técnica](./POLLING_IMPLEMENTATION.md)
- [Resumo Executivo](./RESUMO_POLLING.md)
- [Guia de Testes](./TEST_POLLING.md)
- [Backend - Polling Strategy](../suivia-mvp/ecs/POLLING_STRATEGY.md)

