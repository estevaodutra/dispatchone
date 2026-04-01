

## Plano: Disparar nós com agendamento individual dentro de sequências

### Problema raiz

O `process-scheduled-messages` só verifica agendamentos por nó quando processa `group_messages` (sistema antigo). Para `message_sequences`, ele dispara a sequência inteira via `execute-message`, que **não verifica** `node.config.schedule` — envia todos os nós de uma vez.

Não existe mecanismo para disparar nós individuais nos horários configurados. O `execute-message` já suporta `manualNodeIndex`, mas ninguém o usa para agendamentos.

### Solução

Adicionar uma nova seção no `process-scheduled-messages` que:
1. Busca todas as `message_sequences` ativas (qualquer trigger_type, não só "scheduled")
2. Carrega os `sequence_nodes` dessas sequências
3. Filtra nós que têm `config.schedule.enabled = true` e que combinam com dia/hora atual
4. Para cada nó que combina, chama `execute-message` com `manualNodeIndex` para disparar apenas aquele nó
5. Usa idempotência para não disparar o mesmo nó duas vezes no mesmo horário

### Arquivo modificado

**`supabase/functions/process-scheduled-messages/index.ts`**

Nova seção entre "PROCESS SCHEDULED SEQUENCES" e "DISPATCH SEQUENCES":

```text
// ============= PROCESS PER-NODE SCHEDULED MESSAGES =============
// Scan all active sequences for nodes with individual schedules

1. Query message_sequences WHERE active = true
2. For each sequence, load sequence_nodes WHERE config->schedule->enabled = true
3. Filter nodes matching currentDay + currentTime
4. Check idempotency via scheduled_sequence_executions (using sequence_id + node_order + date + time)
5. Validate campaign status + instance connected
6. Call execute-message with { campaignId, sequenceId, manualNodeIndex: node.node_order }
7. Record execution for idempotency
```

### Detalhes técnicos

- Reutiliza o parâmetro `manualNodeIndex` já existente no `execute-message` — não precisa mudar essa função
- Idempotência: insere em `scheduled_sequence_executions` com `scheduled_time` incluindo o `node_order` (ex: `"08:00_node_2"`) para evitar duplicatas
- Não interfere com o disparo da sequência completa (trigger "scheduled") — são fluxos independentes

### Impacto
- 1 arquivo (edge function), ~80 linhas adicionadas
- Nenhuma mudança no frontend ou banco de dados

