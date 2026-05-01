## Objetivo
Adicionar o item "Carteira" na sidebar com sub-itens (Saldo e Recarga, Extrato, Configurações) e registrar as rotas correspondentes em `App.tsx`.

## Mudanças

### 1. `src/components/layout/AppSidebar.tsx`
Adicionar grupo "Carteira" expansível, no mesmo padrão visual de "Campanhas" (Collapsible quando expandido, Popover quando colapsado).

- Importar ícones extras de `lucide-react`: `Wallet`, `Receipt`, `SlidersHorizontal`.
- Criar lista `walletSubItems`:
  - "Saldo e Recarga" → `/carteira` (ícone `Wallet`)
  - "Extrato" → `/carteira/extrato` (ícone `Receipt`)
  - "Configurações" → `/carteira/configuracoes` (ícone `SlidersHorizontal`)
- Adicionar estado `walletOpen` com base em `location.pathname.startsWith("/carteira")`.
- Renderizar o grupo logo após o bloco "Campaigns" (antes do `Separator`), reusando a mesma estrutura `Collapsible` / `Popover` já usada em campanhas, com gatilho `Wallet` como ícone principal.
- Marcar ativo na rota raiz `/carteira` usando `end` no NavLink para não colidir com sub-rotas.

### 2. `src/App.tsx`
Registrar três rotas protegidas dentro de `AppLayout`:

```text
/carteira                  → WalletPage
/carteira/extrato          → ExtratoPage
/carteira/configuracoes    → WalletSettingsPage
```

Imports a adicionar:
```ts
import WalletPage from "./pages/wallet/WalletPage";
import ExtratoPage from "./pages/wallet/ExtratoPage";
import WalletSettingsPage from "./pages/wallet/WalletSettingsPage";
```

As rotas seguem o mesmo padrão dos demais itens (`<ProtectedRoute><AppLayout>...</AppLayout></ProtectedRoute>`).

## Fora de escopo
- Sem mudanças em traduções/i18n (textos fixos em PT, consistente com "Agendamentos").
- Sem mudanças em backend, hooks ou páginas de carteira (já criados no Bloco A).
