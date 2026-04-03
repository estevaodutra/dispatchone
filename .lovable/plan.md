

## Plano: Adicionar ação "Adicionar a uma Lista" nas ações de enquete

### Objetivo
Incluir um novo tipo de ação `add_to_list` no PollActionDialog, permitindo que ao votar em uma opção da enquete o participante seja adicionado automaticamente a uma Lista de Execução (`group_execution_lists`) do ciclo ativo.

### Alterações

**1. `src/components/group-campaigns/sequences/PollActionDialog.tsx`** — Frontend
- Adicionar `"add_to_list"` ao tipo `PollActionType`
- Adicionar entrada em `ACTION_TYPES`: `{ value: "add_to_list", label: "Adicionar a uma Lista", icon: ClipboardList, color: "text-emerald-500" }`
- Importar `ClipboardList` do lucide-react
- Adicionar seção de config condicional para `actionType === "add_to_list"`:
  - Select para escolher a campanha (já existe `campaigns` do hook `useGroupCampaigns`)
  - A lista ativa será resolvida no backend pela `campaign_id` — o frontend só precisa enviar `campaignId` no config
  - Texto explicativo: "O participante será adicionado à lista de execução ativa desta campanha"
- Atualizar `getActionIconColor` e `getActionLabel` (já cobertos pelo array `ACTION_TYPES`)

**2. `supabase/functions/handle-poll-response/index.ts`** — Backend
- Adicionar case `"add_to_list"` no switch de ações (~25 linhas):
  - Ler `campaignId` do `actionConfig.config` (fallback para `typedPoll.campaign_id`)
  - Buscar `group_execution_lists` ativa para essa campaign com `current_window_end > now()`
  - Se encontrada: upsert em `group_execution_leads` com `list_id`, `cycle_id`, phone, name, `origin_event: "poll_response"`, `origin_detail: option_text`, `status: "pending"`, com `onConflict: "list_id,phone,cycle_id"` e `ignoreDuplicates: true`
  - Retornar resultado com `{ addedToList: true, listId }` ou `{ error: "No active list found" }`

### Arquivos
- `src/components/group-campaigns/sequences/PollActionDialog.tsx` — ~20 linhas adicionadas
- `supabase/functions/handle-poll-response/index.ts` — ~30 linhas adicionadas

