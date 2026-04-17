

User wants to remove the literal "invite" prefix shown before phone numbers in the lead history table. Let me check the source.
<lov-tool-use id="toolu_vrtx_01PubcwoGFikget2R2c1hKF7" name="code--search_files" integration-id="code" data="{\"query\": \"invite\", \"include_patterns\": \"src/components/group-campaigns/tabs/ExecutionListTab.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01TF2RdxRJa4kaQQBeGrZnMQ" name="code--search_files" integration-id="code" data="{\"query\": \"invite\", \"include_patterns\": \"src/components/group-campaigns/tabs/ExecutionListTab.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_012f9R1C6uTvYGCmVgajyUxW" name="code--search_files" integration-id="code" data="{\"query\": \"invite\", \"include_patterns\": \"src/components/group-campaigns/**/*.tsx,src/hooks/useGroupExecutionList.ts\"}">
</lov-tool-use>
The "invite" doesn't seem to come from the codebase as a literal. Let me look at how name is rendered in ExecutionListTab.
<lov-tool-use id="toolu_vrtx_01RKdHxy2TQ7fECRYwmfhGLP" name="code--search_files" integration-id="code" data="{\"include_patterns\": \"src/components/group-campaigns/tabs/ExecutionListTab.tsx\", \"query\": \"name|Nome\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01BC63rYURvCj8DpzvBEpqer" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/group-campaigns/tabs/ExecutionListTab.tsx\", \"lines\": \"270-340\"}">
</lov-tool-use>
Now I understand. The "invite" comes from `lead.name`, not the codebase. The user wants: when name equals "invite" (or some non-real name), don't show it — just show the phone.

Let me check where lead.name gets set to "invite". It's probably from group_join events where `name` is the inviter type or similar. Let me check the processor or webhook code briefly.
<lov-tool-use id="toolu_vrtx_01Ho4b8vSXPzxQGGzuTcSP9G" name="code--search_files" integration-id="code" data="{\"query\": \"\\\"invite\\\"\", \"include_patterns\": \"supabase/functions/**/*.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01V1QvMYnNrtFDSNsraEN5Bj" name="code--search_files" integration-id="code" data="{\"include_patterns\": \"supabase/functions/**/*.ts\", \"query\": \"invite\"}">
</lov-tool-use>
So "invite" is the lead name set somewhere — probably the join_method or similar. Let me check group-execution-processor or webhook-inbound where leads are created with name.
<lov-tool-use id="toolu_vrtx_01AzTuKSufYBBBygBq4sS5kf" name="code--search_files" integration-id="code" data="{\"include_patterns\": \"supabase/functions/**/*.ts\", \"query\": \"group_execution_leads\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01JX42u75eV3hK82XQPxXpQd" name="code--view" integration-id="code" data="{\"file_path\": \"supabase/functions/webhook-inbound/index.ts\", \"lines\": \"370-410\"}">
</lov-tool-use>
So `name` comes from `context.senderName`. The "invite" comes from there — likely the event-classifier extracts "invite" as senderName from GROUP_PARTICIPANT_INVITE notifications. The user's request: when name is "invite" (or similar non-real value), don't display it — show only phone number cleanly.

Simplest UI fix: in the table, treat `"invite"` as no-name. The user specifically said "O nome não ser invite deixa o nome sem nada" → "When the name is invite, leave the name blank".

<lov-plan>

## Plano: Ocultar nome "invite" na tabela de leads

### Problema
Na tabela "Histórico das últimas 24h", todos os leads aparecem com o prefixo `invite` antes do número. Esse valor vem do `senderName` extraído de notificações `GROUP_PARTICIPANT_INVITE` e não é um nome real — é o tipo de evento WhatsApp.

### Solução

Filtrar nomes "lixo" na renderização da tabela em `ExecutionListTab.tsx`. Quando `lead.name` for `"invite"` (ou outro valor de notificação técnica), exibir apenas o telefone, sem prefixo.

### Alteração

**`src/components/group-campaigns/tabs/ExecutionListTab.tsx`** (linhas 285-291)

Adicionar helper:
```ts
const INVALID_NAMES = new Set(["invite", "add", "remove"]);
const displayName = (name?: string | null) =>
  name && !INVALID_NAMES.has(name.toLowerCase().trim()) ? name : null;
```

Substituir renderização da célula nome:
- Se `displayName(lead.name)` existir: mostrar nome em negrito + telefone pequeno ao lado
- Caso contrário: mostrar apenas `lead.phone`

Aplicar mesma lógica no `aria-label` do checkbox.

### Comportamento

- Leads com `name = "invite"` → aparece somente o número (ex: `5521964809425`)
- Leads com nome real (futuro, vindo de WhatsApp profile) → continua exibindo nome + telefone

