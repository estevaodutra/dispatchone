

## Plano: Botão "Enviar para o final da fila" no QueueCard

### Alterações

**1. `src/hooks/useCallQueuePanel.ts`** -- Adicionar mutation `sendToEndOfQueue`
- Busca a maior `position` da `call_queue` (mesma campanha ou global)
- Atualiza o registro com `position = maxPosition + 1`
- Incrementa `attempts` em 1
- Invalida queries

**2. `src/pages/CallPanel.tsx`** -- Atualizar `QueueCard`
- Adicionar prop `onSendToEnd`
- Adicionar botão com icone `ArrowDownToLine` (ou `ChevronsDown`) ao lado do "Remover", com texto "Para o final"
- Passar `sendToEndOfQueue` do hook para o componente

