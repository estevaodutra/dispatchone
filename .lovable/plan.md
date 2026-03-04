

## Corrigir: Campanhas não-prioritárias exibidas como prioritárias no painel

### Diagnóstico
Consultei o banco de dados e confirmei que **todos** os itens na `call_queue` têm `is_priority = true`, mesmo que a campanha associada tenha `is_priority = false`. O campo `call_queue.is_priority` foi preenchido incorretamente (possivelmente por uma inserção ou migração anterior). O painel lê esse campo diretamente, exibindo erroneamente o ícone ⚡ e ⭐.

### Solução (2 partes)

**1. Migração SQL: corrigir dados existentes**
- `UPDATE call_queue SET is_priority = cc.is_priority FROM call_campaigns cc WHERE call_queue.campaign_id = cc.id AND call_queue.is_priority != COALESCE(cc.is_priority, false);`
- Isso corrige todos os itens na fila para refletir a prioridade real da campanha.

**2. Código: ler prioridade da campanha, não do item da fila**

**`src/hooks/useCallQueue.ts`** (linha ~117)
- Alterar a query para incluir `call_campaigns(name, is_priority)` (já busca `call_campaigns(name)`)
- Usar `item.call_campaigns?.is_priority` ao invés de `item.is_priority` para determinar `isPriority`

Isso garante que mesmo se o campo `call_queue.is_priority` estiver incorreto, o painel sempre mostrará a prioridade correta baseada na campanha.

