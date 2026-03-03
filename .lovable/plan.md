

## Plano: Botão de Executar/Pausar para chamadas "AGORA!"

### O que será feito

Adicionar um botão de ação rápida acima da tabela de chamadas (ao lado dos filtros ou abaixo dos cards de métricas) que permite:
- **Discar todas** as chamadas com status "AGORA!" (scheduled/ready com `scheduledFor <= now`) de uma vez, enviando-as para a fila de execução
- **Pausar** a execução quando a fila estiver rodando

O botão será contextual:
- Quando há chamadas "AGORA!" e a fila está parada → mostra **"▶ Discar AGORA! (N)"** (verde)
- Quando a fila está rodando → mostra **"⏸ Pausar"** (amarelo)
- Quando a fila está pausada → mostra **"▶ Retomar"** (verde)

### Alterações

**`src/pages/CallPanel.tsx`**:
1. Calcular `agoraEntries` — filtrar entries com status `scheduled`/`ready` onde `getTimeRemaining().isUrgent === true`
2. Adicionar um bloco de botão entre os filtros e a tabela (ao lado do banner de status ou como um novo mini-banner):
   - Botão "Discar AGORA! (N)" que chama `bulkEnqueue({ callIds })` com os IDs das entradas "AGORA!"
   - Botão "Pausar" que chama `queueSummary.pauseAll()`
   - Botão "Retomar" que chama `queueSummary.resumeAll()`
3. O botão só aparece quando existem chamadas "AGORA!" ou quando a fila está ativa

### Detalhes técnicos
- Reutiliza `bulkEnqueue` do `useCallPanel` (já existente) para enviar chamadas para fila
- Reutiliza `pauseAll`/`resumeAll` do `useQueueExecutionData` (já existente)
- Contagem de "AGORA!" usa `getTimeRemaining(entry.scheduledFor).isUrgent && ["scheduled", "ready"].includes(entry.callStatus)`

