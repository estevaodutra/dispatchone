## Objetivo

Adicionar a opção **"Disparo de Sequência"** dentro de "Ação ao Executar" no diálogo de configuração das Listas de Execução (campanhas de grupo). Ao ser executada, a lista dispara uma sequência de mensagens já configurada na própria campanha, usando o lead capturado como destinatário privado.

## Mudanças

### 1. Banco de dados (migration)
- Tabela `group_execution_lists`:
  - Adicionar coluna `sequence_id uuid NULL` (referenciando `message_sequences.id`, `ON DELETE SET NULL`).
- Sem alterar enum/constraint de `action_type` (campo é `text`), apenas passa a aceitar o valor `"sequence"`.

### 2. UI — `ExecutionListConfigDialog.tsx`
- Estender o tipo de `actionType` para `"webhook" | "message" | "call" | "sequence"`.
- Adicionar nova opção no `RadioGroup` "Ação ao Executar":
  - "Disparo de Sequência" (ícone `Zap` ou `Workflow`).
- Quando selecionada, mostrar um `Select` com as sequências da campanha (via `useSequences(campaignId)`), exibindo nome e estado ativo/inativo.
- Estado novo: `sequenceId` + carregamento/limpeza no `useEffect`.
- Validação `isValid()`: `actionType === "sequence"` exige `sequenceId`.
- `handleSave`: incluir `sequence_id` no payload quando aplicável; demais campos zerados.
- Receber `campaignId` como nova prop para alimentar `useSequences`.

### 3. Hook — `useGroupExecutionList.ts`
- Atualizar a interface `GroupExecutionList` e os tipos do `onSave/createList/updateList` para incluir `sequence_id?: string | null` e o novo `action_type "sequence"`.
- Nas operações de insert/update, gravar `sequence_id` quando `action_type === "sequence"` e setar `null` para os outros campos de ação.

### 4. Página/diálogo pai
- Passar `campaignId` ao `ExecutionListConfigDialog` (provavelmente já disponível na tab onde o diálogo é renderizado).

### 5. Backend — `supabase/functions/group-execution-processor/index.ts`
- Adicionar `sequence_id: string | null` em `ExecutionList`.
- Ler a coluna nova no `select`.
- Novo `case "sequence"` em `executeAction`:
  - Validar `list.sequence_id`.
  - Construir `triggerContext` similar ao `trigger-sequence`:
    ```
    { respondentPhone: lead.phone,
      respondentName: lead.name ?? "",
      respondentJid: `${lead.phone}@s.whatsapp.net`,
      groupJid: "",
      sendPrivate: true,
      customFields: { name: lead.name ?? "", phone: lead.phone, origin_event: lead.origin_event ?? "" } }
    ```
  - Invocar `execute-message` com `{ campaignId: list.campaign_id, sequenceId: list.sequence_id, triggerContext }`.
  - Propagar erro caso `executeError`.

## Observações técnicas
- Não mexer em `src/integrations/supabase/types.ts` — será regenerado.
- A sequência é executada via `execute-message` (mesmo pipeline do `trigger-sequence`), garantindo `sendPrivate` e substituição de variáveis padrão (`{{name}}`, `{{phone}}`).
- Sequências inativas continuarão aparecendo no Select, mas o backend `execute-message` já valida ativação.
