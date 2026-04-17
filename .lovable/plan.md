

## Plano: Visualizar evento disparado + vincular lead ao membro via LID

### Objetivo
1. Adicionar botão "olho" em cada linha da lista 24h para ver o evento original disparado
2. Relacionar cada lead capturado ao membro correspondente na aba **Membros** (via LID), permitindo navegar/identificar quem é a pessoa

### Investigação
- `group_execution_leads` já tem `origin_event` e `origin_detail` (texto, mas geralmente JSON)
- `group_members` tem `lid`, `phone`, `name`, `profile_photo` — pode haver match por `phone` OU por `lid`
- Hoje `group_execution_leads.name` recebe `senderName` (ex: "invite") e não tem coluna `lid`

### Alterações

**1. Migration — adicionar coluna `lid` em `group_execution_leads`**
- Permite vincular precisamente ao membro mesmo quando phone vier vazio/diferente
- Backfill opcional: tentar preencher via LID extraído de `origin_detail` JSON

**2. `supabase/functions/webhook-inbound/index.ts`**
- Ao fazer upsert em `group_execution_leads`, incluir `lid: context.senderLid`

**3. `src/hooks/useGroupExecutionList.ts`**
- Expor `lid` no tipo `GroupExecutionLead`

**4. `src/hooks/useGroupMembers.ts`** (já existe)
- Reutilizado para resolver membro por `phone` ou `lid` no detalhe do evento

**5. `src/components/group-campaigns/tabs/ExecutionListTab.tsx`** — `ExecutionListDetail`
- Nova coluna "Ações" com `Button` ícone `Eye` por linha
- Estado `viewingLead`
- Novo componente inline `LeadEventDialog`:
  - **Lead capturado**: nome (filtrado via `displayName`), telefone, LID (com copiar), status badge, capturado em, executado em
  - **Membro vinculado** (se houver match): foto, nome, telefone, badge "Admin" se aplicável, botão "Ver na aba Membros" (rola/filtra)
  - **Origem**: `origin_event` + bloco `<pre>` com `origin_detail` formatado (try JSON.parse → indentado, fallback texto cru)
  - **Ação configurada na lista**: tipo (`webhook` / `mensagem` / `call`) + alvo
  - **Erro**: bloco vermelho com `error_message` se `status = failed`
  - Botão "Re-executar este lead" (reusa `executeLeads.mutate({ listId, leadIds: [lead.id] })`)

### Comportamento
- Operador clica no olho → modal mostra payload original + a quem o lead pertence (membro do grupo via LID/phone)
- Para leads de campanha pirata ou sem membro vinculado: mostra "Membro não encontrado nesta campanha"
- Re-execução individual funciona dentro do modal sem fechá-lo

