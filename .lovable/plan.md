

## Problema

1. O status `answered` está sendo mapeado para `answered` no `call_logs` (linha 446) — e quando vem com `duration_seconds`, é tratado como `completed` (linhas 467-484). O correto é: `answered` sem duração = `on_call` (em ligação); `answered` com duração = `completed` (finalizada com dados do provedor).
2. A liberação do operador acontece no `call-status` apenas para status terminais, mas o `answered` puro (sem duração) não atualiza para `on_call` — fica como `answered` no DB, e o pop-up precisa mapear manualmente.
3. O `useOperatorCall` tem um timeout de 45s para dialing que é um workaround, mas é válido como fallback de UI (não libera operador, só mostra aviso). Isso pode ser mantido.

## Solução

### 1. `supabase/functions/call-status/index.ts` — Corrigir mapeamento de status

**Linha 444-454** — Atualizar `statusMap`:
```typescript
const statusMap: Record<string, string> = {
  'dialing': 'dialing',
  'answered': 'on_call',     // ← CORRIGIDO: era 'answered', agora 'on_call'
  'ended': 'completed',
  'busy': 'busy',
  'not_found': 'not_found',
  'voicemail': 'voicemail',
  'cancelled': 'cancelled',
  'timeout': 'timeout',
  'error': 'failed',
  'ringing': 'ringing',      // ← ADICIONADO
  'no_answer': 'no_answer',  // ← ADICIONADO
  'completed': 'completed',  // ← ADICIONADO (alias)
  'failed': 'failed',        // ← ADICIONADO (alias)
};
```

**Linha 58** — Adicionar `ringing`, `no_answer`, `completed`, `failed` aos VALID_STATUSES:
```typescript
const VALID_STATUSES = [
  'dialing', 'ringing', 'answered', 'ended', 'completed',
  'busy', 'no_answer', 'not_found', 'voicemail', 'cancelled',
  'timeout', 'error', 'failed'
];
```

**Linhas 467-484** — Ajustar bloco `answered`:
- `answered` sem `duration_seconds` → `on_call` (não é terminal, não libera operador)
- `answered` com `duration_seconds` → `completed` (terminal, libera operador com cooldown)

**Linha 425** — Corrigir mapeamento no bloco de criação de novo call_log:
- Atualizar o inline map para usar `'answered': 'on_call'` e adicionar novos status.

**Linhas 520-538** — Ajustar lista de terminais para incluir `no_answer` e garantir que `on_call` NÃO está na lista:
```typescript
const TERMINAL_STATUSES = [
  'completed', 'failed', 'busy', 'no_answer',
  'not_found', 'voicemail', 'cancelled', 'timeout'
];
```

**Linhas 546-548** — Adicionar `no_answer` ao tratamento de lead status:
- `no_answer` → `pending` (vai ter retry) ao invés de `failed`

**Linha 557** — Adicionar `no_answer` à lista de FAILURE_STATUSES para retry:
```typescript
const FAILURE_STATUSES = ['failed', 'busy', 'no_answer', 'not_found', 'voicemail', 'timeout'];
```

**Falhas sem cooldown**: Para `busy`, `failed`, `error`, `timeout`, `cancelled` → liberar operador direto para `available` sem cooldown. Para `no_answer`, `voicemail`, `completed`/`ended` → liberar com cooldown via RPC.

Atualizar o bloco de liberação (linhas 520-538) para diferenciar:
```typescript
const TERMINAL_WITH_COOLDOWN = ['completed', 'no_answer', 'voicemail'];
const TERMINAL_NO_COOLDOWN = ['failed', 'busy', 'not_found', 'cancelled', 'timeout'];

if (TERMINAL_WITH_COOLDOWN.includes(mappedStatus) && callLog.operator_id) {
  // Release via RPC (aplica cooldown)
  await supabase.rpc('release_operator', { p_call_id: callLog.id });
} else if (TERMINAL_NO_COOLDOWN.includes(mappedStatus) && callLog.operator_id) {
  // Release imediato (sem cooldown)
  await supabase.from('call_operators')
    .update({ status: 'available', current_call_id: null, current_campaign_id: null })
    .eq('id', callLog.operator_id)
    .eq('current_call_id', callLog.id);
}
```

### 2. `src/hooks/useOperatorCall.ts` — Sem mudanças estruturais

O hook já mapeia corretamente `on_call` → popup `on_call` (linha 44-45). A mudança no `call-status` vai fazer o DB gravar `on_call` ao invés de `answered`, e o Realtime vai propagar automaticamente.

O timeout de 45s para dialing (linhas 333-345) é mantido como fallback de UI — não libera operador, apenas mostra botão de cancelar.

### 3. `src/components/operator/CallPopup.tsx` — Sem mudanças

O popup já tem os status corretos mapeados. Vai funcionar automaticamente com a correção no backend.

---

## Resumo

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/call-status/index.ts` | Corrigir mapeamento `answered→on_call`, adicionar status `ringing`/`no_answer`/`completed`/`failed` aos válidos, diferenciar liberação com/sem cooldown, tratar `no_answer` como retriable |

Nenhuma mudança no frontend — o Realtime já propaga o status correto do DB para o popup.

