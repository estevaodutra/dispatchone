

## Plano: Parâmetros adicionais (JSON) para webhook da Lista de Execução

### Objetivo
Adicionar campo "Parâmetros Adicionais (JSON)" no modal de Lista de Execução (apenas quando ação = webhook). Esses parâmetros são mesclados ao payload do webhook, com substituição de variáveis `{{lead.phone}}`, `{{campaign.id}}`, etc.

### Alterações

**1. Migration — `group_execution_lists.webhook_params`**
- Adicionar coluna `webhook_params jsonb DEFAULT '{}'::jsonb`
- Comentário explicativo

**2. `src/hooks/useGroupExecutionList.ts`**
- Adicionar `webhook_params: Record<string, any>` ao tipo `GroupExecutionList`
- Aceitar `webhook_params?: Record<string, any>` em `createList` e `updateList` (apenas persistir quando `action_type === "webhook"`, senão `{}`)

**3. `src/components/group-campaigns/dialogs/ExecutionListConfigDialog.tsx`**
- Estado `webhookParams: string` (texto JSON cru) + `webhookParamsError: string | null`
- Hidratar do `existing.webhook_params` (stringify com indent 2)
- Bloco renderizado dentro de `actionType === "webhook"`, após URL:
  - `Textarea` font-mono para JSON
  - Validação onChange (try/catch JSON.parse) → exibe erro vermelho com `AlertCircle`
  - Texto auxiliar: "Esses dados serão mesclados ao payload do webhook"
  - `Collapsible` "Variáveis Disponíveis" listando: `{{lead.phone}}`, `{{lead.name}}`, `{{lead.lid}}`, `{{lead.email}}`, `{{campaign.id}}`, `{{campaign.name}}`, `{{group.id}}`, `{{event.type}}`, `{{timestamp}}` — cada item clicável copia para clipboard com toast
- `isValid()`: bloquear save se JSON inválido
- `handleSave()`: enviar `webhook_params` parseado (ou `{}` se vazio)

**4. `src/components/group-campaigns/tabs/ExecutionListTab.tsx`**
- Repassar `webhook_params` ao chamar `createList`/`updateList`

**5. `supabase/functions/group-execution-processor/index.ts`**
- Adicionar `webhook_params` em `interface ExecutionList`
- Buscar `group_campaigns` (id, name, instance_id) e respectivo `group_jid` da primeira `campaign_groups` para enriquecer contexto de variáveis
- Função `replaceVariables(obj, ctx)` recursiva (string/array/object) substituindo `{{entity.field}}` e `{{field}}`
- Em `case "webhook"`: aplicar substituição em `webhook_params`, mesclar com payload base existente (campos extras vencem em conflito apenas para chaves customizadas)

### Comportamento
- Campo só aparece para ação Webhook
- JSON inválido bloqueia botão "Salvar" e exibe erro
- Variáveis não resolvidas permanecem literais (`{{x.y}}`) — facilita depuração
- Webhook recebe payload base + chaves customizadas com variáveis substituídas
- Listas existentes funcionam normalmente (default `{}`)

