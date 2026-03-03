

## Problema

Existem **dois problemas** impedindo a discagem:

### 1. `onStartQueue` no CallPanel não inicia a fila de verdade
No `CallPanel.tsx` (linha 1573), o callback `onStartQueue` passado ao `CreateQueueDialog` **apenas mostra um toast** mas nunca chama `callQueue.startQueue(campaignId)`:
```typescript
onStartQueue={(cId) => {
  toast({ title: "Fila iniciada", ... });
  // FALTA: callQueue.startQueue(cId)
}}
```

### 2. Banner de fila "Parada" não tem botão "Iniciar"
O `QueueStatusBanner` mostra botões de Pausar (quando running) e Retomar (quando paused), mas **não mostra nenhum botão "Iniciar"** quando o status é `stopped`. O usuário fica sem forma de iniciar a fila pela aba Fila.

## Correção

### `src/pages/CallPanel.tsx`

1. **Linha 1573**: Alterar o `onStartQueue` para chamar `callQueue.startQueue(cId)` de verdade, além do toast
2. **QueueStatusBanner (linha 302-358)**: Adicionar um botão "Iniciar" quando `globalStatus === "stopped"` e `totalWaiting > 0`, chamando a mesma lógica de `startQueue`

### Detalhes:
- Passar `startQueue` e `isStarting` como props do `QueueStatusBanner`
- O botão "Iniciar" precisa de um `campaignId` — pode usar o filtro de campanha ativo ou, se "todas", usar o primeiro campaign ativo da fila
- No `onStartQueue`, chamar `await callQueue.startQueue(cId)` e navegar para a aba queue

