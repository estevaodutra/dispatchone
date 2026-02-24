

# Fix: Operador nao enviado no webhook do call-dial

## Diagnostico

O endpoint `call-dial` (Edge Function) agenda chamadas via API externa. Na linha 539, o campo `operator` e hardcoded como `null` porque o endpoint apenas agenda a chamada sem reservar um operador.

O problema e que o webhook externo (n8n) precisa saber qual operador vai atender para rotear a chamada, mas recebe `operator: null` e responde com `operator_unavailable`.

Os outros caminhos (`queue-executor` e `dialNow` no frontend) ja reservam o operador via RPC antes de disparar o webhook e incluem os dados corretamente. Apenas o `call-dial` nao faz isso.

## Solucao

Modificar `supabase/functions/call-dial/index.ts` para:

1. **Reservar um operador via RPC** (`reserve_operator_for_call`) antes de disparar o webhook
2. **Incluir os dados do operador** no payload do webhook
3. **Atualizar o call_log e lead** com o operador reservado
4. **Se nao houver operador disponivel**, manter o comportamento atual (operator: null) para que a chamada fique agendada e o queue-executor atribua depois

### Alteracoes no arquivo `supabase/functions/call-dial/index.ts`

Apos criar/atualizar o call_log (linha ~492) e antes de montar o webhook payload (linha ~522):

```text
Fluxo atual:
  1. Cria call_log com operator_id: null, status: 'scheduled'
  2. Dispara webhook com operator: null
  3. n8n recebe operator: null → responde operator_unavailable

Fluxo corrigido:
  1. Cria call_log com operator_id: null, status: 'scheduled'
  2. Tenta reservar operador via RPC reserve_operator_for_call
  3a. Se reservou: atualiza call_log com operator_id e status 'dialing', 
      dispara webhook com dados do operador
  3b. Se nao reservou: dispara webhook com operator: null (mantém agendamento)
```

### Codigo a inserir (entre linhas ~492 e ~511)

- Chamar `supabase.rpc('reserve_operator_for_call', { p_call_id, p_campaign_id })`
- Se `reservation[0].success`, atualizar `call_logs` com `operator_id` e `call_status: 'dialing'`
- Atualizar `call_leads` com `assigned_operator_id`
- Armazenar dados do operador em variavel para uso no payload

### Alteracao no webhook payload (linhas 522-540)

Substituir `operator: null` por condicional:
```
operator: reservedOperator ? {
  id: reservedOperator.id,
  name: reservedOperator.name,
  extension: reservedOperator.extension
} : null
```

### Alteracao no status do call (linhas 524-528)

Se operador foi reservado, o status no payload deve ser `'dialing'` em vez de `'scheduled'`.

### Arquivos alterados

| Arquivo | Descricao |
|---------|-----------|
| `supabase/functions/call-dial/index.ts` | Reservar operador via RPC antes de disparar webhook e incluir dados no payload |

