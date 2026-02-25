

## Diagnóstico: Card mostra "DISCANDO" mas a ligação não está acontecendo

### Causa raiz

Quando o queue-executor reserva um operador e dispara o webhook para o provedor de telefonia, o `call_logs.call_status` é definido como `"dialing"` e o `call_operators.current_call_id` é preenchido. O sistema então aguarda que o provedor envie um callback para `/call-status` para atualizar o status (para `"ringing"`, `"answered"`, `"failed"`, etc.).

Se o provedor recebe o webhook mas **não envia o callback** (ou demora), a chamada fica presa em `"dialing"` indefinidamente. A rotina de self-healing (`heal_stuck_operators`) só reverte logs **sem operador** (`operator_id IS NULL`), então chamadas com operador atribuído não são recuperadas.

O resultado: o operador vê "DISCANDO..." no card para sempre, sem que a ligação de fato aconteça.

### Solução em duas frentes

#### 1. Frontend — Timeout visual no CallPopup

No `CallPopup`, detectar quando o status está em `"dialing"` por mais de **45 segundos** e exibir um aviso visual com opção de cancelar a chamada manualmente.

**Arquivo:** `src/hooks/useOperatorCall.ts`
- Adicionar tracking de `dialingStartedAt` (timestamp de quando entrou em "dialing")
- Expor `dialingTooLong: boolean` (true se > 45s em dialing)

**Arquivo:** `src/components/operator/CallPopup.tsx`
- Quando `dialingTooLong === true`, substituir a animação de bolinhas por um aviso:
  - "⚠️ Sem resposta do provedor — a ligação pode não ter sido iniciada."
  - Botão "Cancelar chamada" que chama `release_operator` via RPC e reverte o call_log para `ready` ou `failed`

#### 2. Backend — Expandir self-healing para dialing com operador

**Arquivo:** `supabase/functions/queue-executor/index.ts`
- Na seção de self-healing (linhas 187-204), adicionar uma segunda query para reverter `call_logs` que estão em `"dialing"` **com operador atribuído** há mais de 3 minutos:

```typescript
// Revert stuck dialing calls WITH operator (provider never responded)
const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000).toISOString();
const { data: stuckDialing } = await supabase
  .from('call_logs')
  .select('id, operator_id')
  .eq('campaign_id', campaignId)
  .eq('call_status', 'dialing')
  .not('operator_id', 'is', null)
  .lt('created_at', threeMinutesAgo);

if (stuckDialing?.length) {
  for (const log of stuckDialing) {
    await supabase.rpc('release_operator', { p_call_id: log.id, p_force: true });
    await supabase
      .from('call_logs')
      .update({ call_status: 'failed', notes: 'Timeout: provedor não respondeu' })
      .eq('id', log.id);
  }
}
```

### Arquivos impactados

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useOperatorCall.ts` | Adicionar `dialingStartedAt` e `dialingTooLong` |
| `src/components/operator/CallPopup.tsx` | Mostrar aviso + botão cancelar após 45s em dialing |
| `supabase/functions/queue-executor/index.ts` | Self-healing para dialing com operador > 3min |

