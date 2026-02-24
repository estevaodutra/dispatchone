

## Plano: Fixar balão do operador no Painel de Ligações

### Contexto

O `CallPopup` atualmente é renderizado como `fixed bottom-6 right-6` no `AppLayout`, flutuando sobre qualquer página. O usuário quer que ele fique fixo (embutido) dentro da página `/painel-ligacoes` em vez de flutuar.

### Alterações

**1. `src/components/operator/CallPopup.tsx`** — Aceitar prop `embedded` que remove posicionamento fixo

- Adicionar prop `embedded?: boolean` ao componente
- Quando `embedded=true`, trocar classes `fixed bottom-6 right-6 z-50` por classes inline (sem position fixed)
- No estado minimizado/idle: remover `fixed`, usar `w-full` em vez de tamanho automático
- No estado expandido: remover `fixed`, usar `w-full` em vez de `w-[380px]`

**2. `src/pages/CallPanel.tsx`** — Renderizar `CallPopup` embutido acima das tabs

- Importar `CallPopup` 
- Renderizar `<CallPopup embedded />` entre o header e as tabs (antes da linha 605)

**3. `src/components/layout/AppLayout.tsx`** — Continuar renderizando o `CallPopup` global (para outras páginas)

- Sem alteração necessária — o popup global continua para outras rotas
- Alternativa: esconder o global quando estiver em `/painel-ligacoes` para evitar duplicata

### Abordagem para evitar duplicata

Adicionar prop `hidden?: boolean` ou verificar a rota atual no `AppLayout`. A solução mais limpa:

- No `CallPopup`, aceitar `embedded?: boolean`
- No `AppLayout`, passar uma prop ou usar `useLocation` para esconder o popup quando a rota for `/painel-ligacoes`

### Detalhes de implementação

```typescript
// CallPopup.tsx - nova interface
interface CallPopupProps {
  embedded?: boolean;
}

export function CallPopup({ embedded = false }: CallPopupProps) {
  // ...existing logic...
  
  // Classes condicionais:
  // embedded: sem fixed, w-full, sem shadow extremo
  // floating (default): fixed bottom-6 right-6 z-50
}
```

```typescript
// AppLayout.tsx - esconder na rota do painel
import { useLocation } from "react-router-dom";

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const hideFloatingPopup = location.pathname === "/painel-ligacoes";
  
  return (
    <SidebarProvider defaultOpen>
      {/* ...existing... */}
      {!hideFloatingPopup && <CallPopup />}
    </SidebarProvider>
  );
}
```

```typescript
// CallPanel.tsx - embutir o popup
import { CallPopup } from "@/components/operator/CallPopup";

// Renderizar antes das tabs (linha ~605):
<CallPopup embedded />
<Tabs value={panelTab} onValueChange={setPanelTab}>
```

### Resultado
- No Painel de Ligações: balão do operador aparece fixo dentro da página, acima das tabs
- Em outras páginas: balão continua flutuante no canto inferior direito
- Sem duplicatas

