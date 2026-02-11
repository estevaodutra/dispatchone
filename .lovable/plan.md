

# Adicionar Toggle Online/Offline nos Cards de Operadores

## O que sera feito

Adicionar um Switch (toggle) em cada card de operador no painel, permitindo alternar rapidamente entre os status "available" (online) e "offline" diretamente na lista, sem precisar abrir o dialog de configuracao.

## Mudancas

### `src/components/call-panel/OperatorsPanel.tsx`

No componente `OperatorCard`:

1. Importar o componente `Switch` de `@/components/ui/switch`
2. Adicionar o hook `useCallOperators` para acessar `updateOperatorStatus`
3. Inserir um `Switch` ao lado dos botoes de acao (antes do botao de configurar)
   - **checked**: `operator.status === "available"`
   - **disabled**: quando o operador esta em ligacao (`on_call`) ou cooldown (nao pode ser desligado manualmente nesses estados)
   - **onChange**: alterna entre `available` e `offline` chamando `updateOperatorStatus({ id, status })`
4. Adicionar um tooltip ou label visual indicando "Online" / "Offline"

### Comportamento

- Toggle **ligado** = status `available` (operador recebe ligacoes)
- Toggle **desligado** = status `offline` (operador nao participa)
- Desabilitado quando o operador esta `on_call` ou `cooldown` (estados gerenciados pelo sistema)
- O operador inativo (`isActive = false`) tambem tera o toggle desabilitado

### Detalhes Tecnicos

- A mutation `updateOperatorStatus` ja existe no hook `useCallOperators` e aceita `{ id, status }`
- O Switch sera posicionado na area de acoes do card, antes dos botoes de engrenagem e lixeira
- Cores do switch seguem o padrao do tema (primary quando checked)

