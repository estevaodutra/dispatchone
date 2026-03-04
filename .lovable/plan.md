

## Sistema de Prioridade 3:1 com Round-Robin entre Campanhas

### Problema Atual
O `queue-processor` opera **por campanha** — é chamado com `campaign_id` e só processa itens daquela campanha. Não há lógica cross-campaign para decidir qual campanha discagem primeiro.

### Mudança Arquitetural

Transformar o processador de "per-campaign" para "per-company", implementando a lógica 3:1 no nível da empresa.

---

### 1. Migração de Banco

Adicionar campos de controle de prioridade no `queue_execution_state`:

```sql
ALTER TABLE queue_execution_state
  ADD COLUMN IF NOT EXISTS priority_counter integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_priority_campaign_id uuid,
  ADD COLUMN IF NOT EXISTS last_normal_campaign_id uuid;
```

> Nota: `is_priority` já existe em `call_campaigns`. Não precisa de alteração.

---

### 2. Nova Função RPC: `queue_get_next_v2`

Criar a função SQL conforme descrita pelo usuário (com ajustes):
- Recebe `p_company_id`
- Passo 1: Verifica agendadas (`scheduled_for <= NOW`) — sempre na frente
- Passo 2: Lista campanhas prioritárias e normais com itens na fila
- Passo 3: Decide pelo `priority_counter` (0-2 = prioritária, 3 = normal, reset)
- Passo 4: Round-robin dentro do nível (alterna `last_priority_campaign_id` / `last_normal_campaign_id`)
- Passo 5: Seleciona próximo item da campanha escolhida (`created_at ASC`)
- Passo 6: Atualiza contadores

Usa `FOR UPDATE SKIP LOCKED` para concorrência.

Precisa de um registro "global" no `queue_execution_state` — usar `campaign_id` como um ID sentinel ou criar um registro com `campaign_id = company_id` para armazenar os contadores globais.

---

### 3. Reescrever `queue-processor/index.ts`

Mudar o fluxo principal:

**Antes**: Recebe `campaign_id`, busca item apenas daquela campanha.

**Depois**: Aceita nova action `global_tick` com `company_id`:
1. Verifica se há **qualquer** campanha ativa (`queue_execution_state` running)
2. Heal operators + resolve cooldowns (uma vez)
3. Verifica operador disponível
4. Chama `queue_get_next_v2(company_id)` — a função SQL decide qual campanha/item
5. Cria `call_log`, reserva operador, dispara webhook (igual hoje)
6. Mantém compatibilidade com action `tick` + `campaign_id` existente

---

### 4. Atualizar `useCallQueue.ts` — Tick Loop

Mudar `tickAll()`:
- Em vez de iterar `for (const id of activeIds)` chamando `queue-processor?campaign_id=X&action=tick` para cada campanha...
- Fazer **uma única chamada**: `queue-processor?company_id=X&action=global_tick`
- O processador decide internamente qual campanha/item processar

---

### 5. UI — Já existe

O toggle de prioridade já está implementado no `ConfigTab.tsx` (linha 62: `isPriority` state). A lista de campanhas já mostra `⚡` para prioritárias. Não precisa de alteração de UI.

---

### Resumo de Arquivos

| Arquivo | Alteração |
|---------|-----------|
| Migração SQL | Adicionar 3 colunas em `queue_execution_state` + criar `queue_get_next_v2` |
| `supabase/functions/queue-processor/index.ts` | Nova action `global_tick`, chamar RPC `queue_get_next_v2` |
| `src/hooks/useCallQueue.ts` | `tickAll()` chama `global_tick` com `company_id` em vez de per-campaign |

