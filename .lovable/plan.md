

## Plano: Remover o CallPopup flutuante global

### Problema
O componente `CallPopup` flutuante (fixo no canto inferior direito) está sobrepondo outros elementos da interface, atrapalhando a navegação.

### Solução
Remover a renderização do `CallPopup` no `AppLayout.tsx`. O componente já existe de forma embarcada (embedded) dentro do `CallPanel` (`/painel-ligacoes`), então o operador continuará tendo acesso ao controle de chamadas nessa página.

### Alteração

| Arquivo | Mudança |
|---------|---------|
| `src/components/layout/AppLayout.tsx` | Remover a importação e renderização do `<CallPopup />` |

Será removido:
- A linha `import { CallPopup }` 
- A variável `hideFloatingPopup`
- O `{!hideFloatingPopup && <CallPopup />}` no JSX

