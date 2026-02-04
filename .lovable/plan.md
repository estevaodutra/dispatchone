
# Plano: Remover Menu Superior de Categorias

Remover o `TabsList` que aparece no topo da seção de Endpoints, mantendo apenas a navegação pela sidebar lateral.

---

## Alteração Necessária

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/ApiDocs.tsx` | Remover o componente `TabsList` (linhas 220-230) |

---

## O que será removido

```typescript
// Remover estas linhas (220-230):
<TabsList className="flex flex-wrap gap-1 h-auto p-1 bg-muted/50 mb-6">
  {apiEndpoints.map((category) => (
    <TabsTrigger 
      key={category.id} 
      value={category.id}
      className="text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
    >
      {category.name}
    </TabsTrigger>
  ))}
</TabsList>
```

---

## Resultado

- A navegação entre categorias será feita **exclusivamente pela sidebar**
- O conteúdo do `TabsContent` continuará funcionando normalmente
- A interface ficará mais limpa, sem duplicação de navegação
