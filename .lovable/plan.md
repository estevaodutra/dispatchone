

## Problema

A tela branca é causada pelo servidor Vite de desenvolvimento falhando ao servir os módulos JavaScript. Os logs mostram:
- `ERR_HTTP2_PROTOCOL_ERROR` no chunk principal do React
- Erros 503 em múltiplos arquivos (`Logs.tsx`, `BulkTagDialog.tsx`)
- `[vite] server connection lost. Polling for restart...`

A causa raiz: o `App.tsx` importa **todas as 15+ páginas de forma eager/síncrona**, incluindo o `CallPanel.tsx` com 2169 linhas. Isso faz o servidor tentar carregar centenas de módulos simultaneamente.

## Correção

Implementar **lazy loading** com `React.lazy()` em todas as páginas no `App.tsx`, de forma que cada página só seja carregada quando o usuário navega até ela.

### `src/App.tsx`

1. Substituir todos os imports estáticos de páginas por `React.lazy()`:
```typescript
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Leads = lazy(() => import("./pages/Leads"));
const CallPanel = lazy(() => import("./pages/CallPanel"));
// ... todas as outras páginas
```

2. Envolver o `<Routes>` com `<Suspense>` e um fallback de loading:
```typescript
<Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
  <Routes>...</Routes>
</Suspense>
```

### Impacto
- Reduz drasticamente o número de módulos carregados na inicialização
- Cada página só é carregada quando acessada
- Resolve o problema de memória/rede do servidor Vite
- Não muda nenhuma funcionalidade existente

