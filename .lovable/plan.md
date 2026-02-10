

# Verificacao de operador ativo antes de discar

## Problema

Quando o sistema vai executar uma ligacao (dialNow), ele usa o operador atribuido no card sem verificar se esse operador esta ativo. Se o operador (ex: "mauro - R. 1003") estiver com `is_active = false`, a ligacao sera enviada para um ramal indisponivel.

## Solucao

Antes de disparar o webhook no `dialNowMutation`, consultar a tabela `call_campaign_operators` para verificar se o operador atribuido esta ativo. Se nao estiver, buscar o proximo operador ativo da mesma campanha e reatribuir automaticamente a ligacao.

## Alteracoes

### Arquivo: `src/hooks/useCallPanel.ts`

#### Dentro de `dialNowMutation.mutationFn` (antes de montar o payload)

1. Apos encontrar a `entry`, buscar o operador atribuido na tabela `call_campaign_operators`
2. Se `is_active = false` (ou operador nao encontrado), buscar o primeiro operador ativo da mesma campanha
3. Se encontrar operador ativo substituto:
   - Atualizar `call_logs.operator_id` para o novo operador
   - Atualizar `call_leads.assigned_operator_id` para o novo operador
   - Usar os dados do novo operador no payload do webhook
4. Se nenhum operador ativo estiver disponivel, lancar erro: "Nenhum operador ativo disponivel nesta campanha"

#### Logica detalhada

```text
1. entry = find call by id
2. if entry.operatorId:
   a. query call_campaign_operators WHERE id = entry.operatorId
   b. if operator.is_active == false:
      - query call_campaign_operators WHERE campaign_id = entry.campaignId AND is_active = true ORDER BY created_at LIMIT 1
      - if found:
        - UPDATE call_logs SET operator_id = newOp.id
        - UPDATE call_leads SET assigned_operator_id = newOp.id (if leadId exists)
        - use newOp data in payload (name, extension)
      - if not found:
        - throw Error("Nenhum operador ativo disponivel")
```

#### Payload do webhook atualizado

O campo `operator` no payload usara os dados do operador efetivo (original se ativo, substituto se redirecionado).

## Detalhe tecnico

- A verificacao acontece apenas no momento do `dialNow`, nao altera o fluxo de agendamento
- O toast de sucesso informara se houve redirecionamento: "Ligacao iniciada (operador redirecionado para [nome])"
- Apenas 1 arquivo modificado: `src/hooks/useCallPanel.ts`

