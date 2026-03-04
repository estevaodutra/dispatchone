

## Problema

A aba "Fila" mostra apenas itens da tabela `call_queue` (que está vazia). Porém, existem **283 call_logs** com status `ready` (176) e `scheduled` (107) que deveriam aparecer na fila também.

O plano original dizia "Combinar dados de `call_queue` (waiting) + `call_logs` (scheduled/ready)", mas a implementação atual só consulta `call_queue`.

## Correção

**Arquivo: `src/pages/CallPanel.tsx`**

Adicionar uma query secundária para buscar `call_logs` com status `scheduled` ou `ready`, mapeá-los para o mesmo formato `QueueItem`, e combinar com os itens de `call_queue` no `queueEntries`.

### Detalhes

1. **Nova query inline** no `CallPanel.tsx` (ao lado da query de `answeredEntries`):
   - Busca `call_logs` com `call_status IN ('scheduled', 'ready')` e `company_id = activeCompanyId`
   - Filtra por campanha e busca se aplicável
   - Mapeia para formato compatível com `QueueItem` (com prefixo `cl_` no ID para evitar colisões)

2. **Combinar listas**: Criar um `combinedQueue` que concatena `queueEntries` (da `call_queue`) + `scheduledEntries` (dos `call_logs`), ordenando por: agendadas primeiro (por `scheduled_for`), depois prioridade, depois posição.

3. **Atualizar o contador** no MetricCard "Na Fila" para incluir ambas as fontes.

4. **Atualizar a paginação** para usar `combinedQueue` em vez de apenas `queueEntries`.

### Campos mapeados de call_logs → QueueItem

| call_logs | QueueItem |
|-----------|-----------|
| `id` | `id` (prefixo `cl_`) |
| `campaign_id` | `campaignId` |
| `call_campaigns.name` | `campaignName` |
| `lead_id` | `leadId` |
| `call_leads.phone` ou `leads.phone` | `phone` |
| `call_leads.name` ou `leads.name` | `leadName` |
| `scheduled_for` | Preservado como campo extra |
| `call_status` | `status` |
| `is_priority` (do campaign) | `isPriority` |

A aba continuará usando a tabela existente, apenas com dados combinados.

