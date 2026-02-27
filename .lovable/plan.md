

## Plano: Mover "Anteriores" e "Reagendar" para dentro do CallActionDialog

O usuário quer que o botão "Ver Anteriores" e o reagendamento inline fiquem dentro do card principal (CallActionDialog), não no popup flutuante.

### Alterações em `src/components/operator/CallActionDialog.tsx`

1. **Importar** `InlineReschedule` e `PreviousCallsSheet` + `History` icon
2. **Adicionar estados**: `showPreviousCalls`
3. **Adicionar botão "◀ Anteriores"** no header do dialog, ao lado do X de fechar
4. **Adicionar `InlineReschedule`** na aba "Ligação", entre o Roteiro e as Ações (seção "⚡ Ações Rápidas")
5. **Renderizar `PreviousCallsSheet`** no final do componente

### Alterações em `src/components/operator/CallPopup.tsx`

1. **Remover** o botão "Anteriores" do header do popup (já que vai para o dialog)
2. **Remover** o `InlineReschedule` do popup (já que vai para o dialog)
3. **Remover** o `PreviousCallsSheet` render e estado `showPreviousCalls` do popup

### Resultado

- O card grande (CallActionDialog) terá: Reagendamento inline + botão de anteriores
- O popup pequeno (CallPopup) fica apenas com status, info do lead e atalhos de disponibilidade

