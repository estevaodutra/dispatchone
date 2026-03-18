

## Plano: Sistema Unificado de Classificação de Eventos WhatsApp

### Correções necessárias no plano original

O plano referencia tabelas/colunas que **não existem** no projeto:
- `whatsapp_events` → a tabela real é **`webhook_events`**
- `whatsapp_instances` → a tabela real é **`instances`** (com `external_instance_id`)
- Colunas como `company_id`, `direction`, `confidence`, `matched_rule` não existem em `webhook_events`

O processamento de **poll responses** e **pirate group joins** em `webhook-inbound` é complexo e crítico — precisa ser preservado integralmente.

### Implementação (3 etapas)

#### 1. Criar `_shared/event-classifier.ts`
- Lógica de classificação unificada baseada no plano do usuário
- Exporta `classifyEvent()`, `extractPhone()`, `extractChatId()`, `extractMessageId()`
- Adiciona campos `direction`, `confidence`, `matchedRule`
- Prioridade: pollVote > mídia > grupos > status > texto > fallback

#### 2. Migração: adicionar colunas a `webhook_events`
```sql
ALTER TABLE webhook_events
ADD COLUMN IF NOT EXISTS direction text DEFAULT 'system',
ADD COLUMN IF NOT EXISTS confidence text DEFAULT 'low',
ADD COLUMN IF NOT EXISTS matched_rule text;
```
Índices para `event_type`, `processing_status`, `sender_phone`.

#### 3. Atualizar as Edge Functions existentes

**`webhook-inbound/index.ts`**: 
- Importar classificador de `../_shared/event-classifier.ts`
- Substituir toda a lógica de classificação duplicada (~400 linhas) pelo import
- Manter o fluxo de: normalizar payload → classificar → inserir → processar poll/pirate
- Salvar novos campos (`direction`, `confidence`, `matched_rule`)
- Manter URL e interface existentes (sem quebrar n8n/Z-API)

**`reclassify-events/index.ts`**:
- Importar o mesmo classificador de `../_shared/event-classifier.ts`
- Remover ~350 linhas de lógica duplicada
- Manter toda a lógica de paginação/cursor que já funciona
- Atualizar novos campos ao reclassificar

**`useWebhookEvents.ts`** (frontend):
- Adicionar novos campos ao tipo `WebhookEvent` e ao mapeamento DB→app

**`WebhookEvents.tsx`** (UI):
- Exibir `direction`, `confidence` e `matched_rule` no modal de detalhes

### Decisão: NÃO criar `webhook-zapi` separado

Criar um novo endpoint exigiria reconfigurar todos os webhooks no n8n/Z-API e invalidaria URLs já documentadas na API docs. A abordagem mais segura é **refatorar in-place**: mesmos endpoints, mesma interface, lógica unificada por trás.

### Arquivos modificados

| Arquivo | Ação |
|---------|------|
| `supabase/functions/_shared/event-classifier.ts` | **Criar** — classificador único |
| `supabase/functions/webhook-inbound/index.ts` | **Refatorar** — usar classificador compartilhado |
| `supabase/functions/reclassify-events/index.ts` | **Refatorar** — usar classificador compartilhado |
| `src/hooks/useWebhookEvents.ts` | **Atualizar** — novos campos |
| `src/pages/WebhookEvents.tsx` | **Atualizar** — exibir novos campos |
| Migração SQL | **Criar** — 3 colunas + índices |

