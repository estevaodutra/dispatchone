
# Corrigir Disparo de Sequencias de Dispatch no Painel de Ligacoes

## Problema

Quando o operador registra uma acao como "Tentei te Ligar" no Painel de Ligacoes, a funcao `executeActionAutomation` sempre chama a Edge Function `trigger-sequence`, que e projetada exclusivamente para sequencias de **campanhas de grupo** (tabela `message_sequences`).

Porem, as acoes estao configuradas com `campaignType: "dispatch"` e apontam para sequencias na tabela `dispatch_sequences`. Como `trigger-sequence` consulta `message_sequences`, a sequencia nao e encontrada e nada acontece.

Dados do banco confirmam o problema:

```text
action_config: {
  campaignId: "ff3ebe47-...",
  campaignType: "dispatch",        <-- tipo dispatch
  sequenceId: "d8d3d74b-..."       <-- sequencia de dispatch
}
```

## Solucao

Modificar a funcao `executeActionAutomation` em `src/hooks/useCallLeads.ts` para verificar o campo `campaignType` do `action_config` e chamar a Edge Function correta:

- Se `campaignType === "dispatch"`: chamar `execute-dispatch-sequence` passando `campaignId`, `sequenceId`, e os dados do lead (telefone, nome)
- Caso contrario (group ou indefinido): manter o comportamento atual chamando `trigger-sequence`

### Arquivo modificado

**`src/hooks/useCallLeads.ts`** - funcao `executeActionAutomation`, caso `start_sequence` (linhas 15-27)

Logica atualizada:

```text
case "start_sequence":
  1. Buscar dados do lead (call_leads)
  2. Verificar config.campaignType
  3. Se "dispatch":
     -> Chamar execute-dispatch-sequence com:
        - campaignId (da config)
        - sequenceId (da config)
        - contactPhone (do lead)
        - contactName (do lead)
  4. Senao:
     -> Manter chamada a trigger-sequence (comportamento atual)
```

Nenhuma outra alteracao e necessaria. A Edge Function `execute-dispatch-sequence` ja possui toda a logica de envio ao webhook, substituicao de variaveis e logging.
