

## Diagnóstico

O loop de discagem (`useQueueExecutionSummary`) que envia "ticks" ao `queue-executor` a cada 8 segundos **só está montado dentro de `CallPanel.tsx`** (linha 426). Quando o operador navega para qualquer outra página, o hook desmonta, o `setInterval` é limpo e nenhum tick é enviado — as chamadas param de ser processadas.

O mesmo vale para o polling de `bulkPollingActive` no `useCallPanel` (linha 323), que também só roda enquanto `CallPanel.tsx` está montado.

## Solução

Mover a execução global do `useQueueExecutionSummary` para o `AppLayout`, garantindo que o loop de ticks rode **independentemente da página** onde o operador está.

### Alterações

#### 1. `src/components/layout/AppLayout.tsx` — Montar o hook globalmente

Importar e invocar `useQueueExecutionSummary()` dentro do `AppLayout`, que é o wrapper de todas as páginas protegidas. O hook já faz todo o trabalho internamente (polling de estado, ticks, manutenção). Basta chamá-lo para que o loop inicie.

```tsx
import { useQueueExecutionSummary } from "@/hooks/useQueueExecution";

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const hideFloatingPopup = location.pathname === "/painel-ligacoes";

  // Global queue tick loop — runs on all pages
  useQueueExecutionSummary();

  return ( /* ... existing JSX ... */ );
}
```

#### 2. `src/pages/CallPanel.tsx` — Manter o hook para uso local da UI

O `CallPanel.tsx` continua usando `useQueueExecutionSummary()` normalmente para exibir os dados do sumário na interface. Ambas as instâncias do hook compartilham o mesmo `useQuery` (via React Query key `queue_execution_state_all`), então não haverá duplicação de dados. Os intervalos de tick são protegidos pelo flag `tickInFlightRef` que evita execuções simultâneas.

| Arquivo | Alteração |
|---------|-----------|
| `src/components/layout/AppLayout.tsx` | Importar e invocar `useQueueExecutionSummary()` para manter o loop de ticks ativo globalmente |

Nenhuma alteração em `CallPanel.tsx` — ele já usa o hook e continuará funcionando normalmente.

