

## Corrigir registro de ações no histórico

### Diagnóstico

Confirmei no banco de dados que **todos os `action_id` estão NULL** para o lead ESTEVÃO. Há dois problemas distintos:

**Problema 1 — Ação manual não salva (principal)**
Quando o CallActionDialog é aberto a partir de um lead na fila, o `callId` passado é `""` (string vazia, linha 1745 do CallPanel.tsx). O `handleSave` faz `.update(updates).eq("id", "")` — que não encontra nenhum registro e falha silenciosamente. A ação nunca é persistida.

**Problema 2 — Histórico não atualiza após salvar**
O histórico no CallActionDialog é carregado via `useEffect` cujas dependências (`open`, `leadId`, `campaignId`, `callId`) não mudam após salvar. Se o usuário salva e olha o histórico sem fechar/reabrir, vê dados antigos.

### Solução

**1. `src/components/operator/CallActionDialog.tsx` — corrigir save com callId vazio**

No `handleSave`, quando `currentData.callId` estiver vazio, buscar o call_log mais recente do lead+campaign e usá-lo como alvo do update:

```typescript
// Em handleSave, antes do update:
let targetCallId = currentData.callId;

if (!targetCallId && currentData.leadId && currentData.campaignId) {
  const { data: latestLog } = await (supabase as any)
    .from("call_logs")
    .select("id")
    .eq("lead_id", currentData.leadId)
    .eq("campaign_id", currentData.campaignId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  
  if (latestLog) targetCallId = latestLog.id;
}

if (!targetCallId) {
  toast({ title: "Erro", description: "Nenhum registro de ligação encontrado para este lead", variant: "destructive" });
  return;
}

// Usar targetCallId no .eq("id", targetCallId)
```

**2. `src/components/operator/CallActionDialog.tsx` — refresh do histórico após salvar**

Adicionar um estado `historyVersion` que é incrementado após o save, e incluí-lo nas dependências do `useEffect` de fetch do histórico:

```typescript
const [historyVersion, setHistoryVersion] = useState(0);

// No handleSave, após o update:
setHistoryVersion(v => v + 1);

// No useEffect de fetch (adicionar historyVersion nas deps):
useEffect(() => { ... }, [open, currentData.leadId, currentData.campaignId, currentData.callId, historyVersion]);
```

**3. `src/pages/CallPanel.tsx` — passar callLogId quando disponível para queue leads**

No componente que abre o CallActionDialog para queue leads (linha 1741-1757), se o queue item tiver um `callLogId`, passar como `callId`:

```typescript
callId={viewingQueueLead.callLogId || ""}
```

### Arquivos alterados
1. `src/components/operator/CallActionDialog.tsx` — resolver callId vazio + refresh histórico
2. `src/pages/CallPanel.tsx` — passar callLogId do queue item

