

## Plano: Adicionar "Executar agora" no menu do MessageCard

### Alterações

**1. `src/components/group-campaigns/sequences/MessageCard.tsx`**
- Adicionar prop `onExecute?: () => void` ao `MessageCardProps`
- Adicionar item "Executar agora" no dropdown menu (ícone `Zap`), antes do separador de mover, com cor de destaque (ex: `text-primary`)

**2. `src/components/group-campaigns/sequences/MessageTimeline.tsx`**
- Adicionar prop `onExecuteNode?: (node: LocalNode) => void` ao `MessageTimelineProps`
- Passar `onExecute={() => onExecuteNode?.(node)}` para cada `MessageCard`

**3. `src/components/group-campaigns/sequences/TimelineSequenceBuilder.tsx`**
- Criar handler `handleExecuteNode(node)` que invoca `supabase.functions.invoke("execute-message", { body: { campaignId, sequenceId, manualNodeIndex: node.nodeOrder } })` (mesmo padrão do `handleManualSendNode` existente)
- Passar `onExecuteNode={handleExecuteNode}` para `MessageTimeline`
- Adicionar estado `isExecuting` para feedback visual

3 arquivos, ~20 linhas adicionadas.

