

## Plano: Exibir observações no Painel de Ligações

### Problema

O campo `observations` foi adicionado ao banco e ao hook `useOperatorCall`, mas o fluxo do **Painel de Ligações** (`CallPanel.tsx` + `useCallPanel.ts`) não inclui esse campo. Quando o `ActionDialog` abre, ele sempre inicializa `notes` como string vazia.

### Alterações

**1. `src/hooks/useCallPanel.ts`**

- Adicionar `observations: string | null` à interface `CallPanelEntry` (linha 32)
- Adicionar `observations: string | null` à interface `DbCallLogJoined` (linha 57)
- Mapear `observations: db.observations || null` na função `transformEntry` (linha 105)

**2. `src/pages/CallPanel.tsx`**

- Na função `openActionDialog` (linha 553-555): trocar `setActionNotes("")` por `setActionNotes(entry.observations || "")`
- Isso faz com que o campo "Observações" venha pré-preenchido com o valor enviado via API

### Resultado

Quando uma ligação tiver `observations` (enviado via `/call-dial` com o campo `obs`), ao abrir o dialog de ação no Painel de Ligações, o campo de notas virá pré-preenchido com esse valor. O operador pode editar/complementar.

