

## Plano: Cards em Grid

### Alteração

**Arquivo: `src/components/group-campaigns/sequences/MessageTimeline.tsx`**

Substituir o layout horizontal (`flex flex-nowrap` + `overflow-x-auto` + scroll arrows) por um **grid responsivo** com 3-4 colunas:

1. **Remover** scroll arrows (ChevronLeft/ChevronRight buttons) e o `scrollRef`
2. **Remover** imports não usados (`useRef`, `ChevronLeft`, `ChevronRight`)
3. **Substituir** o container flex horizontal por:
   ```tsx
   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
   ```
4. **Remover** `shrink-0`, `style={{ width: 288 }}` e timeline connectors (dots + horizontal line) de cada card wrapper
5. **Manter** filtros, stats bar e empty state

### Resumo
- 1 arquivo modificado
- Remove scroll horizontal, arrows e timeline visual
- Cards em grid responsivo (1→2→3→4 colunas)

