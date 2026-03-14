

## Registrar execução de ações no histórico de ligações

### Problema
Quando uma ação é executada automaticamente (ex: webhook após retentativas excedidas), o resultado não é registrado em nenhum lugar visível. O `execute-call-action` roda a ação mas não persiste o resultado.

### Solução

Registrar o resultado da execução da ação diretamente no `call_logs` correspondente, usando os campos existentes `action_id` e `notes`, e exibir essa informação no histórico.

**1. `supabase/functions/execute-call-action/index.ts` — persistir resultado no call_log**

Após executar a ação e gerar o `results`, buscar o `call_log` mais recente do lead+campaign e atualizar:
- `action_id` com o ID da ação executada
- Concatenar no `notes` uma linha descrevendo o resultado da automação (ex: `[Automação] Webhook executado com sucesso` ou `[Automação] Webhook falhou: timeout`)

O request body já recebe `lead_id` e `campaign_id`, então basta fazer um update no call_log mais recente:

```typescript
// After results are computed, persist to call_log
if (lead_id && campaign_id) {
  const { data: latestLog } = await supabase
    .from("call_logs")
    .select("id, notes")
    .eq("lead_id", lead_id)
    .eq("campaign_id", campaign_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (latestLog) {
    const automationNote = results.success 
      ? `[Automação] ${actionType} executado com sucesso`
      : `[Automação] ${actionType} falhou: ${results.error || results.reason || 'erro desconhecido'}`;
    
    const updatedNotes = latestLog.notes 
      ? `${latestLog.notes}\n${automationNote}` 
      : automationNote;

    await supabase
      .from("call_logs")
      .update({ action_id: action_id, notes: updatedNotes })
      .eq("id", latestLog.id);
  }
}
```

**2. `src/components/operator/CallActionDialog.tsx` — exibir ação no histórico**

No histórico de contatos dentro do dialog, mostrar quando uma ação foi registrada:
- Se `entry.action_id` existir, fazer join com `call_script_actions` para mostrar o nome da ação
- Ou, mais simples: detectar `[Automação]` no `notes` e renderizar com um badge visual diferenciado

Abordagem escolhida: join com `call_script_actions` via nome da ação.

Alterar a query de histórico (linha 214) para incluir o join com actions:
```typescript
.select("id, call_status, attempt_number, duration_seconds, started_at, ended_at, notes, custom_message, created_at, action_id, call_operators!call_logs_operator_id_fkey(operator_name), call_script_actions!call_logs_action_id_fkey(name, color)")
```

No render do histórico, adicionar um badge com o nome da ação quando existir:
```tsx
{entry.action_name && (
  <div className="text-xs">
    <span className="text-muted-foreground">⚡ Ação: </span>
    <Badge variant="secondary" className="text-xs">{entry.action_name}</Badge>
  </div>
)}
```

E detectar notas de automação (`[Automação]`) para renderizar com estilo diferenciado (ícone de engrenagem, cor amarela/info).

**3. `src/components/call-campaigns/tabs/HistoryTab.tsx` — mostrar ação na tabela**

Adicionar coluna "Ação" na tabela de histórico da campanha:
- Incluir join com `call_script_actions` no hook `useCallLogs`
- Mostrar nome da ação e status (sucesso/falha baseado no `notes`)

### Arquivos alterados
1. `supabase/functions/execute-call-action/index.ts` — persistir resultado no call_log
2. `src/components/operator/CallActionDialog.tsx` — exibir ação no histórico do dialog
3. `src/hooks/useCallLogs.ts` — incluir join com actions na query
4. `src/components/call-campaigns/tabs/HistoryTab.tsx` — coluna de ação na tabela

