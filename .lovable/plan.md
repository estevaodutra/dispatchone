

## Plano: Campos Chave-Valor (estilo n8n) para parâmetros do Webhook

### Objetivo
Substituir o textarea JSON atual por um sistema de **campos dinâmicos** (nome / tipo / valor), com drag-and-drop para reordenar e substituição de variáveis. Mais intuitivo e visual que JSON cru.

### Decisões importantes

- **Sem nova dependência**: usar HTML5 nativo (`draggable` + `onDragStart/Over/Drop`) em vez de instalar `@hello-pangea/dnd`. Drag-and-drop simples para reordenação vertical não justifica nova lib.
- **Formato persistido**: `webhook_params` continua `JSONB`, mas passa a aceitar **dois formatos**:
  - Novo: `[{ name, type, value }, ...]` (array)
  - Antigo: `{ chave: valor, ... }` (objeto) — mantido por compatibilidade
- **Migração suave**: ao abrir uma lista existente que tem `webhook_params` no formato antigo (objeto), o dialog converte automaticamente para array. Edge function detecta o formato e processa adequadamente.
- **Tipos suportados**: `string`, `number`, `boolean`.

### Alterações

**1. `src/components/group-campaigns/dialogs/ExecutionListConfigDialog.tsx`**
- Remover estado `webhookParams: string` + `webhookParamsError`
- Adicionar estado `webhookFields: WebhookField[]` onde `WebhookField = { id, name, type: 'string'|'number'|'boolean', value }`
- Hidratação:
  - Se `existing.webhook_params` for array → usar diretamente (gerar `id` se faltar)
  - Se for objeto não-vazio → converter cada par em `{ id: uuid, name, type: 'string', value: String(v) }`
  - Senão → `[]`
- Novo subcomponente inline `KeyValueFields`:
  - Lista de linhas: handle drag (`GripVertical`), `Input` nome (flex-1), `Select` tipo (~120px com ícone T/#/◐), `Input` valor (flex-1, font-mono), `Button` ícone `Trash2`
  - Drag nativo: `draggable` no handle, `onDragStart` salva index, `onDragOver` previne default, `onDrop` reordena array
  - Botão "+ Adicionar Campo" abaixo da lista (área tracejada quando lista vazia)
  - `Collapsible` "Variáveis Disponíveis" mantido (clique copia para clipboard)
- `isValid()`: validar que campos com `name` preenchido não tenham name duplicado; campos sem name são ignorados (não bloqueiam)
- `handleSave()`: enviar `webhook_params: webhookFields` (array) quando `actionType === "webhook"`

**2. `src/hooks/useGroupExecutionList.ts`**
- Mudar tipo: `webhook_params: Record<string, any> | Array<{ id: string; name: string; type: string; value: string }>`
- `createList`/`updateList`: aceitar o array como está (JSONB suporta ambos)

**3. `supabase/functions/group-execution-processor/index.ts`**
- Função utilitária `paramsToObject(params, ctx)`:
  - Se `params` for array: iterar, pular itens sem `name`, aplicar `replaceVariables` em `value`, converter conforme `type` (`number` → `Number()`, `boolean` → `value === 'true' || value === '1'`, `string` → mantém)
  - Se `params` for objeto: usar lógica atual (`replaceVariables` recursivo)
  - Senão: retornar `{}`
- No `case "webhook"`: substituir o uso atual de `replaceVariables(list.webhook_params, ctx)` por `paramsToObject(list.webhook_params, ctx)`

**4. Sem migration**
A coluna `webhook_params` já é JSONB e aceita arrays. Listas antigas continuam funcionando via fallback.

### Comportamento final

- UI mais visual e amigável: cada parâmetro é uma linha com nome, tipo e valor
- Drag-and-drop reordena campos
- Tipos garantem que `priority: "1"` vire `1` (number) no payload final
- Variáveis `{{lead.phone}}` continuam sendo substituídas dentro de cada `value`
- Listas existentes (formato objeto) são migradas automaticamente ao primeiro save; o backend processa ambos os formatos sem quebra

