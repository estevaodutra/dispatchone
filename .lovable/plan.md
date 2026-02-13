

# Implementar Execucao de Sequencias para Campanhas de Disparos

## Problema

As campanhas de disparos possuem o construtor visual de sequencias e a UI funcionando, porem nao ha nenhum motor de execucao conectado. Dois problemas especificos:

1. **Nenhuma funcao backend executa sequencias de disparos**: A edge function `execute-message` so funciona com `group_campaigns` (consulta a tabela `group_campaigns` e `sequence_nodes`). As sequencias de disparos usam tabelas diferentes (`dispatch_campaigns`, `dispatch_sequence_steps`).

2. **Acoes de ligacao nao disparam sequencias**: Quando o operador registra uma acao do tipo `start_sequence`, o codigo em `useCallPanel.ts` apenas atualiza o `call_logs` e `call_leads` mas nunca executa a acao configurada (nao le o `action_type` nem invoca a sequencia).

## Solucao

### 1. Criar edge function `execute-dispatch-sequence`

Nova edge function em `supabase/functions/execute-dispatch-sequence/index.ts` que:

- Recebe `{ campaignId, sequenceId, contactPhone, contactName, customFields }`
- Consulta `dispatch_campaigns` para obter a instancia vinculada
- Consulta `dispatch_sequence_steps` para obter os passos da sequencia
- Itera pelos passos, construindo o payload padrao e enviando ao webhook de mensagens
- Suporta delays (com persistencia na tabela `sequence_executions` para delays longos)
- Registra logs na tabela `dispatch_sequence_logs`

### 2. Atualizar `registerAction` para executar acoes

Em `src/hooks/useCallPanel.ts`, apos registrar o resultado da ligacao, ler a acao (`call_script_actions`) para verificar o `action_type`. Se for `start_sequence`:

- Ler o `action_config` para obter `campaignId`, `campaignType` e `sequenceId`
- Se `campaignType === "dispatch"`, invocar `execute-dispatch-sequence`
- Se `campaignType === "group"`, invocar `execute-message` (existente)
- Passar o telefone do lead como destino

### 3. Integrar `process-scheduled-messages` com dispatch

Atualizar a edge function `process-scheduled-messages` para tambem verificar sequencias de dispatch com trigger_type "scheduled", alem das sequencias de grupo que ja processa.

## Detalhes Tecnicos

### Edge Function: `execute-dispatch-sequence/index.ts`

```text
Fluxo:
1. Recebe request com campaignId + sequenceId + contactPhone
2. Busca dispatch_campaigns -> instances (instancia conectada)
3. Busca dispatch_sequence_steps ordenados por step_order
4. Para cada step:
   - Se "delay": aguarda ou persiste para retomada
   - Se "message": monta payload padrao e envia ao webhook
5. Registra em dispatch_sequence_logs
```

Campos do payload padrao (mesmo formato do grupo):
- `action`: `message.send_text`, `message.send_image`, etc.
- `node.config`: conteudo da mensagem
- `campaign`: id e nome da campanha de disparo
- `instance`: dados da instancia vinculada
- `destination.phone`: telefone do contato

### Mudanca em `useCallPanel.ts` (registerActionMutation)

Apos a linha que atualiza o call_logs (linha 580), adicionar:

```typescript
// Buscar a acao para verificar se tem automacao
const { data: actionData } = await (supabase as any)
  .from("call_script_actions")
  .select("action_type, action_config")
  .eq("id", actionId)
  .maybeSingle();

if (actionData?.action_type === "start_sequence" && actionData.action_config) {
  const { campaignId, campaignType, sequenceId } = actionData.action_config;
  
  if (campaignType === "dispatch" && sequenceId && entry?.phone) {
    // Invocar execute-dispatch-sequence
    await supabase.functions.invoke("execute-dispatch-sequence", {
      body: {
        campaignId,
        sequenceId,
        contactPhone: entry.phone,
        contactName: entry.leadName || "",
      },
    });
  } else if (campaignType === "group" && sequenceId) {
    // Invocar execute-message existente
    await supabase.functions.invoke("execute-message", {
      body: {
        campaignId,
        sequenceId,
        triggerContext: {
          respondentPhone: entry?.phone || "",
          respondentName: entry?.leadName || "",
          respondentJid: entry?.phone ? `${entry.phone}@s.whatsapp.net` : "",
          groupJid: "",
          sendPrivate: true,
        },
      },
    });
  }
}
```

### Config TOML

Adicionar ao `supabase/config.toml`:

```toml
[functions.execute-dispatch-sequence]
verify_jwt = false
```

### Arquivos modificados

1. **Novo**: `supabase/functions/execute-dispatch-sequence/index.ts` - Motor de execucao para sequencias de disparo
2. **Editar**: `src/hooks/useCallPanel.ts` - Executar automacoes quando acao e registrada
3. **Editar**: `supabase/functions/process-scheduled-messages/index.ts` - Suportar dispatch agendados

