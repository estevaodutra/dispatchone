

## Plano: Corrigir scroll do popup de configuração

### Problema
O `DialogContent` base aplica `display: grid` via Tailwind. Mesmo com `flex flex-col` no override, o `cn()` não garante que `flex` sobrescreva `grid` (depende da ordem no CSS gerado). Além disso, o `ScrollArea` do Radix precisa de altura explícita para funcionar — `flex-1 min-h-0` nem sempre resolve dentro de grid.

### Correção

**Arquivo:** `src/components/sequences/UnifiedNodeConfigPanel.tsx`

Substituir `ScrollArea` por um `div` com `overflow-y-auto` e garantir que o layout funcione:

```tsx
// Linha 258 - Forçar !grid e usar flex
<DialogContent className="max-w-md max-h-[85vh] !flex !flex-col p-0 gap-0 overflow-hidden">

// Linha 265 - Trocar ScrollArea por div com overflow
<div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
  ...
</div>
// Remover fechamento do ScrollArea correspondente
```

- `!flex !flex-col` usa `!important` para sobrescrever o `grid` base
- `overflow-y-auto` num div simples é mais confiável que `ScrollArea` quando o container tem height constraints via flex

### Impacto
- 1 arquivo, 3 linhas alteradas
- Scroll funcional para acessar agendamento e demais campos abaixo

