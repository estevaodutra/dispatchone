

## Plano: Adicionar filtro de tags na página de Leads

### Contexto
A página de Leads já exibe tags por lead e o hook `useLeads` já suporta o filtro `tags` (usando `overlaps` no Supabase). Falta apenas o componente de filtro na UI e uma query para buscar as tags disponíveis.

### Alterações

#### 1. `src/hooks/useLeads.ts` — Adicionar query de tags únicas
Adicionar uma query similar à `groupNamesQuery` que busca todas as tags distintas dos leads do usuário. Como tags é um array JSONB, será necessário usar `unnest` ou buscar todos os arrays e extrair no cliente.

Abordagem pragmática: buscar os leads com tags não-vazias e extrair as tags únicas no frontend (mesmo padrão usado para `groupNames`).

```typescript
const tagNamesQuery = useQuery({
  queryKey: ["leads-tag-names"],
  queryFn: async () => {
    const { data } = await supabase
      .from("leads")
      .select("tags")
      .not("tags", "eq", "{}");
    const allTags = (data || []).flatMap(d => d.tags || []);
    return [...new Set(allTags)].sort();
  },
});
```

Retornar `availableTags: tagNamesQuery.data || []` no objeto de retorno do hook.

#### 2. `src/pages/Leads.tsx` — Adicionar filtro de tag na barra de filtros

- Novo estado: `const [tagFilter, setTagFilter] = useState("all")`
- Passar `tags: tagFilter !== "all" ? [tagFilter] : undefined` no objeto `filters`
- Adicionar um `<Select>` após o filtro de origem com as tags disponíveis:

```tsx
<Select value={tagFilter} onValueChange={(v) => { setTagFilter(v); setPage(1); }}>
  <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tag" /></SelectTrigger>
  <SelectContent>
    <SelectItem value="all">Todas as tags</SelectItem>
    {availableTags.map(tag => (
      <SelectItem key={tag} value={tag}>{tag}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useLeads.ts` | Nova query `tagNamesQuery` + retornar `availableTags` |
| `src/pages/Leads.tsx` | Novo estado `tagFilter`, passar para `filters.tags`, renderizar `<Select>` de tags |

