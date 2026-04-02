

## Plano: Corrigir Layout Timeline para Scroll Horizontal

### Diagnóstico

O `MessageTimeline.tsx` já usa `flex gap-6` e `overflow-x-auto`, mas falta `flex-nowrap` explícito no container dos cards. Além disso, a largura mínima precisa ser garantida com `min-w-max` no container correto e os cards precisam de `shrink-0` explícito no wrapper (não só no card interno).

### Alteração

**Arquivo: `src/components/group-campaigns/sequences/MessageTimeline.tsx`**

Linha 139 — alterar o container flex dos cards:
```tsx
// DE:
<div className="flex gap-6 px-6 min-w-max py-2">

// PARA:
<div className="flex flex-nowrap gap-6 px-6 py-2" style={{ minWidth: "max-content" }}>
```

Linha 152 — adicionar `shrink-0` ao wrapper de cada card:
```tsx
// DE:
<div key={node.id} className="flex flex-col items-center relative">

// PARA:
<div key={node.id} className="flex flex-col items-center relative shrink-0" style={{ width: 288 }}>
```

Isso garante que:
- `flex-nowrap` impede quebra de linha
- `shrink-0` + largura fixa no wrapper impede que os cards encolham
- `style={{ minWidth: "max-content" }}` via inline style é mais robusto que a classe Tailwind

### Resumo
- 1 arquivo, 2 linhas alteradas
- Sem impacto funcional, apenas visual

