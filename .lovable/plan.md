

# Remover Atribuicao de Operador no Agendamento + Enfileirar quando Indisponivel

## Problema

1. Ao agendar uma ligacao via `call-dial`, o sistema ja fixa um operador. Se ele estiver offline no momento real da discagem, gera inconsistencia.
2. Se nenhum operador estiver disponivel no momento da discagem manual, o sistema retorna erro em vez de enfileirar a ligacao.

## Solucao

### 1. `supabase/functions/call-dial/index.ts` -- Remover atribuicao de operador

- **Remover** todo o bloco de busca de operadores (linhas 427-481): a busca round-robin, a contagem de calls por operador e a selecao.
- **Remover** a validacao que retorna erro 400 `no_operator_available` (linhas 438-461). Agendamento nao depende de operador.
- Nos inserts/updates do `call_logs` (linhas 507 e 527): gravar `operator_id: null`.
- No update do `call_leads` (linha 554): gravar `assigned_operator_id: null`.
- No payload do webhook (linhas 590-594): enviar `operator: null`.

Resultado: ligacoes agendadas ficam com operador "Auto" no painel.

### 2. `src/hooks/useCallPanel.ts` -- Enfileirar em vez de dar erro

Atualmente na `dialNowMutation`, quando nao ha operador disponivel (linha 276-278), o sistema lanca um erro. A mudanca:

- Em vez de `throw new Error(...)`, alterar o status da ligacao para `"waiting_operator"` no `call_logs`.
- Retornar `{ queued: true }` para exibir um toast informando que a ligacao foi colocada em espera.
- Quando o operador nao tem `operatorId` (ligacao agendada como "Auto"), buscar operadores disponiveis diretamente (sem a checagem de operador atual).
- Reestruturar o inicio do bloco para tratar o caso `entry.operatorId === null` (Auto) da mesma forma que operador indisponivel.

Logica simplificada:

```text
1. Buscar operadores com is_active=true E status=available
2. Se encontrar -> atribuir via round-robin, prosseguir com discagem
3. Se NAO encontrar -> atualizar call_status para "waiting_operator", retornar toast "Aguardando operador"
```

### 3. `supabase/functions/queue-executor/index.ts` -- Sem alteracao

O executor de fila ja:
- Verifica `status === 'available'` nos operadores
- Muda para `waiting_operator` ou `paused` quando nenhum esta disponivel
- Retoma automaticamente quando um operador fica disponivel

Ele tambem pode ser estendido futuramente para processar ligacoes com status `waiting_operator`, mas isso ja funciona pela logica de fila existente.

## Resumo das Alteracoes

| Arquivo | Alteracao |
|---|---|
| `supabase/functions/call-dial/index.ts` | Remover busca de operador; gravar `operator_id: null` e `assigned_operator_id: null`; webhook com `operator: null` |
| `src/hooks/useCallPanel.ts` | Tratar `operatorId === null`; enfileirar como `waiting_operator` quando nao ha operador disponivel |

