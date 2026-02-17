
# Adicionar botao de Pausar/Retomar Fila no banner da aba Fila

## Problema

O banner de status da fila (QueueStatusBanner) mostra o estado das filas mas nao oferece controle para pausar ou retomar a execucao diretamente da aba Fila.

## Solucao

### Arquivo: `src/hooks/useQueueExecution.ts`

Adicionar funcoes `pauseAll` e `resumeAll` ao hook `useQueueExecutionSummary` que atualizam o status de todas as campanhas ativas para "paused" ou de volta para "running":

```typescript
// Novas mutations no useQueueExecutionSummary:
const pauseAllMutation = useMutation({
  mutationFn: async () => {
    const activeStates = states.filter(s => 
      ["running", "waiting_operator", "waiting_cooldown"].includes(s.status)
    );
    for (const s of activeStates) {
      await supabase.from("queue_execution_state")
        .update({ status: "paused" })
        .eq("campaign_id", s.campaignId);
    }
  },
  onSuccess: () => queryClient.invalidateQueries(...)
});

const resumeAllMutation = useMutation({
  mutationFn: async () => {
    const pausedStates = states.filter(s => s.status === "paused");
    for (const s of pausedStates) {
      await supabase.from("queue_execution_state")
        .update({ status: "running" })
        .eq("campaign_id", s.campaignId);
    }
  },
  onSuccess: () => queryClient.invalidateQueries(...)
});
```

Retornar `pauseAll`, `resumeAll`, `isPausingAll`, `isResumingAll` no objeto de retorno do hook.

### Arquivo: `src/pages/CallPanel.tsx`

Atualizar o componente `QueueStatusBanner` para:

1. Receber as novas props `pauseAll`, `resumeAll`, `isPausingAll`, `isResumingAll`
2. Exibir um botao "Pausar" (icone Pause) quando o globalStatus for "running" ou "mixed"
3. Exibir um botao "Retomar" (icone Play) quando o globalStatus for "paused"
4. Os botoes ficam ao lado do botao "Buscar operadores" ja existente

Layout do banner atualizado:
```
[dot] [icon] Em execucao · 2 executando   [Operadores badge]   [Pausar] [Buscar operadores]
```

Nenhuma mudanca de banco de dados ou edge functions necessaria -- apenas atualiza o campo `status` na tabela `queue_execution_state` que ja existe.
