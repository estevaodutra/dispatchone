

The user reports the message list isn't appearing in the "Executar Lista" dialog ("Nenhuma mensagem encontrada"), and there are build errors. Let me investigate.
<lov-tool-use id="toolu_vrtx_01PYvBM9WVQxC4V5xQM2FvVW" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/group-campaigns/dialogs/ExecuteListDialog.tsx\", \"lines\": \"1-50\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01VaKAEKki8i6BZwd5zJkgE8" name="code--search_files" integration-id="code" data="{\"query\": \"useGroupMessages\", \"include_patterns\": \"src/**/*.ts,src/**/*.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01NvkB62ehDwU3W7SNLEp7JM" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/group-campaigns/dialogs/ExecutionListConfigDialog.tsx\", \"lines\": \"1-60\"}">
</lov-tool-use>
The user reports two issues: (1) build errors after my last edit, (2) the message list in "Executar Lista" dialog shows "Nenhuma mensagem encontrada". Let me investigate.
<lov-tool-use id="toolu_vrtx_013McCag2rsvaH8BhWPageJ2" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/group-campaigns/dialogs/ExecutionListConfigDialog.tsx\"}">
</lov-tool-use>
The user said "a lista não está aparecendo" with screenshot showing the **Execute List dialog** (ExecuteListDialog) showing "Nenhuma mensagem encontrada". And there are also build errors.

Let me check both: build error origins and the ExecuteListDialog issue.
<lov-tool-use id="toolu_vrtx_014aYGh4XMVF5msCdaVkehmZ" name="code--exec" integration-id="code" data="{\"command\": \"cd /dev-server && npx tsc --noEmit 2>&1 | head -80\", \"user_facing_description\": \"Checking TypeScript build errors\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01Lb9VWNHMUV8ePFLd4YbwDQ" name="code--search_files" integration-id="code" data="{\"query\": \"useGroupMessages\", \"include_patterns\": \"src/**/*.ts,src/**/*.tsx\"}">
</lov-tool-use>
TypeScript passed. Let me check what the build errors actually are:
<lov-tool-use id="toolu_vrtx_0193zfSMv8KnWs7iyZyB72vb" name="code--exec" integration-id="code" data="{\"command\": \"cd /dev-server && npx vite build 2>&1 | tail -40\", \"user_facing_description\": \"Running build to see errors\", \"timeout\": 180}">
</lov-tool-use>
Build passes! The "build errors" shown are likely stale or transient. Now let me focus on the real problem: **"a lista não está aparecendo"** — the user is seeing "Nenhuma mensagem encontrada" in the **ExecuteListDialog**. This is a different dialog (Executar Lista from Members tab), and it shows messages from `useGroupMessages` filtered by `m.active === true`.

Let me verify whether messages exist for this campaign:
<lov-tool-use id="toolu_vrtx_01G4eHzC5LNRVyzYeYLoUVZM" name="code--exec" integration-id="code" data="{\"command\": \"psql -c \\\"SELECT id, group_campaign_id, type, active, LEFT(content, 40) as content FROM group_messages ORDER BY created_at DESC LIMIT 20;\\\"\", \"user_facing_description\": \"Checking existing group messages in the database\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01WfL1gHDoZM7pS8Bo6CXvJA" name="code--view" integration-id="code" data="{\"file_path\": \"src/components/group-campaigns/dialogs/ExecuteListDialog.tsx\", \"lines\": \"26-50\"}">
</lov-tool-use>
Now I understand. The `ExecuteListDialog` only fetches `group_messages` (the simple message templates), but the user's modern flow uses **sequences** built in the Sequences tab — which are stored in `message_sequences`/sequence nodes, not as standalone `group_messages`. The current campaign likely has sequences set up but no standalone messages, so the dialog shows empty.

Let me confirm by checking sequences for relevant campaigns:
<lov-tool-use id="toolu_vrtx_01SRRk1uhfLk6hQB8bkgy7Q2" name="code--exec" integration-id="code" data="{\"command\": \"psql -c \\\"SELECT id, group_campaign_id, name, trigger_type, active FROM message_sequences ORDER BY created_at DESC LIMIT 20;\\\"\", \"user_facing_description\": \"Checking message sequences\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01DcKYz4PjeGoADHqmNHWGKC" name="code--search_files" integration-id="code" data="{\"query\": \"useSequences\", \"include_patterns\": \"src/hooks/useSequences.ts\"}">
</lov-tool-use>
Confirmed. Most active campaigns have **sequences** (not individual messages). The `ExecuteListDialog` only shows `group_messages`, ignoring sequences. The user wants to send a sequence to selected members from the Members tab.

Let me check how sequences are normally executed for selected members (e.g., via ExecuteSequenceDialog):
<lov-tool-use id="toolu_vrtx_01PdDpAzJA1VGp4Ts1Che6HV" name="code--search_files" integration-id="code" data="{\"include_patterns\": \"src/components/group-campaigns/**/*.tsx\", \"query\": \"ExecuteSequenceDialog|ExecuteListDialog\"}">
</lov-tool-use>
Now I have full context. There are two separate dialogs from the bulk menu:
- **"Executar Sequência"** → `ExecuteSequenceDialog` → uses `useSequences` (works)
- **"Executar Lista"** → `ExecuteListDialog` → uses `useGroupMessages` (shows empty because campaigns only have sequences, no individual messages)

The "Executar Lista" option duplicates and confuses the UX. The user expects to see something there. The fix: either remove "Executar Lista" or make it list **execution lists** (`group_execution_lists`) — as the name suggests! Looking at the menu label "Executar Lista" alongside the existing `ExecutionListTab` feature, this makes much more sense — an Execution List is what the user configures (with webhook params, etc.).

<lov-plan>

## Diagnóstico

O usuário vê "Nenhuma mensagem encontrada" no modal **Executar Lista** (acessado via Membros → ações em massa). Confirmado no banco:

- A campanha atual **não tem `group_messages`** (mensagens avulsas) — usa apenas **sequências**
- O modal `ExecuteListDialog` consulta `useGroupMessages(campaignId)`, que vem vazio
- Já existe outro item "Executar Sequência" no mesmo menu que cobre o caso de sequências
- O nome "Executar Lista" sugere **Lista de Execução** (`group_execution_lists`) — não mensagens avulsas

Sobre o "build error": a build de produção (`vite build`) passa sem erro real. O TypeScript também passa. O erro reportado pelo Lovable parece transitório/falso-positivo da última edição — sem ação necessária.

## Solução

Reformular o `ExecuteListDialog` para listar as **Listas de Execução** configuradas na campanha (`group_execution_lists`), e disparar a ação configurada (webhook/mensagem/ligação) para os membros selecionados como se fossem leads capturados.

### Alterações

**1. `src/components/group-campaigns/dialogs/ExecuteListDialog.tsx` — refatoração**
- Substituir `useGroupMessages` por `useGroupExecutionList(campaignId)`
- Listar `lists.filter(l => l.is_active)`; mostrar nome, badge da `action_type` (Webhook/Mensagem/Ligação) e preview (URL truncada / template / nome da campanha de ligação)
- Filtro de busca por nome
- Card de pré-visualização da lista selecionada (resumo: ação, alvo, eventos monitorados ignorados aqui pois é manual)
- Botão "Enviar Agora": chama nova função edge que processa cada membro selecionado como lead da lista
- Manter checkbox "Apenas membros ativos", intervalo, contagens e tempo estimado
- Remover textos atuais "mensagem" → trocar por "lista"

**2. Backend — `supabase/functions/group-execution-processor/index.ts`**
- Adicionar nova action `manual_execute`: aceita `{ listId, campaignId, members: [{ phone, lid, name }] }`
- Para cada membro: criar linha em `group_execution_leads` (com `triggered_manually = true`) e chamar a lógica existente de execução da lista (webhook com params/replaceVariables, mensagem ou ligação) — reusar `paramsToObject` e o builder atual
- Respeitar o intervalo entre execuções no servidor (delay configurado pelo usuário)

**3. `src/hooks/useGroupExecutionList.ts`**
- Adicionar `manualExecute({ listId, members, intervalSeconds })` mutation que invoca a edge function
- Toast de sucesso/erro

### Comportamento final

- Usuário seleciona membros → "Executar Lista" → vê as Listas de Execução ativas configuradas
- Escolhe uma lista → "Enviar Agora" → backend dispara a ação configurada (ex: webhook com parâmetros) para cada membro como se fossem leads recém-capturados
- Coerência com o conceito de "Lista de Execução" do restante do app
- "Executar Sequência" continua funcionando para sequências (separação clara)

