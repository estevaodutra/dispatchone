

## Separar registro de ação do encerramento da ligação

### Problema
Tanto o `CallActionDialog.handleSave()` quanto o `useCallPanel.registerAction` estão marcando `call_status: "completed"` e `ended_at` imediatamente ao registrar uma ação. Isso contradiz o princípio de que o encerramento da ligação deve vir exclusivamente do callback externo (`call-status`).

### Solução

**1. `src/components/operator/CallActionDialog.tsx` (linhas 311-315)**
- Remover `call_status: "completed"` e `ended_at` do update no `handleSave`
- Manter apenas: `notes`, `action_id`, e `scheduled_for` (se reagendamento)
- Remover a chamada `release_operator` (quem libera é o callback)
- Ajustar toast para "Ação registrada" sem dizer "ligação finalizada"

**2. `src/hooks/useCallPanel.ts` (linhas 638-661)**
- No `registerActionMutation`, remover `call_status: "completed"` e `ended_at` do update
- Manter apenas `action_id` e `notes`
- Remover `release_operator` (callback cuida disso)
- Remover a atualização de `call_leads.status = "completed"` (também deve vir do callback)

**3. `supabase/functions/call-status/index.ts`**
- Garantir que ao receber status terminal, além de deletar da `call_queue`, ele também aplique o `action_id` que já foi registrado previamente no `call_logs` para executar automações pendentes, se houver

### Fluxo corrigido
```text
Operador registra ação → salva action_id + notes no call_logs (status NÃO muda)
Callback chega com status terminal → call-status marca completed/failed + ended_at + release_operator + remove da call_queue
```

