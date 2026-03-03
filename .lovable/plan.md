

## Diagnóstico

O banco de dados mostra:
- Operador Mauro: `status = 'offline'`, `current_call_id = NULL`
- Mas existe um `call_log` ativo: `id = 77bffa01`, `call_status = 'dialing'`, `operator_id = b3b40264` (Mauro), com `external_call_id` definido

O link entre operador e chamada foi **quebrado**. A causa: o `heal_stuck_operators` Case B (recém-adicionado) limpa `current_call_id` para qualquer operador que **não esteja em `on_call`** — mas não verifica se o `call_log` associado ainda está ativo. Se o operador mudar brevemente de status (ex: page refresh que auto-seta `available`, ou toggle offline), o heal limpa o link mesmo com a chamada em andamento.

Dois problemas a corrigir:

### 1. `heal_stuck_operators` Case B é agressivo demais

Atualmente limpa `current_call_id` para qualquer operador `status != 'on_call'` com call_id. Deveria **verificar se o call_log associado está em estado terminal** antes de limpar. Se o call_log ainda está em `dialing`, `ringing`, `in_progress` ou `answered`, o operador deveria ser **restaurado para `on_call`**, não ter o call_id limpo.

**Correção SQL**: No CTE `stuck_ghost`, adicionar condição que o call_log associado NÃO esteja ativo:
```sql
AND NOT EXISTS (
  SELECT 1 FROM call_logs cl
  WHERE cl.id = op.current_call_id
    AND cl.call_status IN ('dialing','ringing','answered','in_progress')
)
```

E adicionar um **Case C** que detecte operadores com call ativo mas status errado, e os restaure para `on_call`:
```sql
stuck_wrong_status AS (
  UPDATE call_operators op
  SET status = 'on_call', updated_at = NOW()
  WHERE op.is_active = true
    AND op.status != 'on_call'
    AND op.current_call_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM call_logs cl
      WHERE cl.id = op.current_call_id
        AND cl.call_status IN ('dialing','ringing','answered','in_progress')
    )
  RETURNING op.id, op.operator_name, op.status
)
```

### 2. `useOperatorCall` não tem fallback quando `current_call_id` é NULL

O hook só detecta chamadas ativas via `operator.current_call_id`. Se o link for quebrado, a chamada fica invisível no popup. Adicionar um fallback no `fetchOperator` que busca `call_logs` ativos por `operator_id` quando `current_call_id` é NULL.

**Correção no hook** (`useOperatorCall.ts`, após linha 217):
```typescript
// Fallback: check for active call_logs by operator_id
if (!opData.current_call_id && opData.status !== 'offline') {
  const { data: activeLog } = await supabase
    .from('call_logs')
    .select('id')
    .eq('operator_id', opData.id)
    .in('call_status', ['dialing','ringing','answered','in_progress'])
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeLog) {
    // Restore the link
    await supabase.from('call_operators')
      .update({ current_call_id: activeLog.id, status: 'on_call' })
      .eq('id', opData.id);
    // Load the call
    currentCallIdRef.current = activeLog.id;
    const callData = await fetchCallData(activeLog.id);
    if (callData) {
      setCurrentCall(callData);
      setCallStatus(mapDbStatus(callData.callStatus));
      subscribeToCallLog(activeLog.id);
    }
  }
}
```

### Resumo

| Arquivo | Mudança |
|---------|---------|
| Migration SQL (heal_stuck_operators) | Case B: não limpar se call ativo. Case C: restaurar `on_call` se call ativo |
| `src/hooks/useOperatorCall.ts` | Fallback: buscar call_logs ativos por operator_id quando current_call_id é null |

