
# Adicionar Filtro de Grupo WhatsApp na Pagina de Leads

## Resumo

Quando o tipo "Grupo" estiver selecionado, exibir um novo dropdown ao lado dos filtros existentes listando os nomes reais dos grupos WhatsApp (extraidos de `source_group_name`). Ao selecionar um grupo, filtrar os leads por esse grupo especifico.

## Mudancas

### 1. `src/hooks/useLeads.ts`

- Adicionar campo `sourceGroupName` na interface `LeadFilters`
- Aplicar filtro `.eq("source_group_name", filters.sourceGroupName)` na query quando presente
- Adicionar uma nova query para buscar a lista distinta de `source_group_name` dos leads do usuario (para popular o dropdown)

### 2. `src/pages/Leads.tsx`

- Adicionar estado `groupFilter` para o grupo selecionado
- Passar `sourceGroupName` nos filtros quando `groupFilter` nao for "all"
- Renderizar um novo `Select` dropdown condicional: so aparece quando `typeFilter === "grupos"` ou `sourceFilter === "whatsapp_group"`
- O dropdown lista os nomes dos grupos vindos da nova query
- Ao trocar o tipo para outro valor que nao "grupos", resetar o `groupFilter` para "all"

### 3. `src/pages/Leads.tsx` -- getSelectedIds

- Adicionar o filtro `source_group_name` na query de selecao global para consistencia

## Detalhes tecnicos

### Nova query em useLeads

```text
// Buscar nomes distintos de grupos
const groupNamesQuery = useQuery({
  queryKey: ["leads-group-names"],
  queryFn: async () => {
    const { data } = await supabase
      .from("leads")
      .select("source_group_name")
      .not("source_group_name", "is", null)
      .order("source_group_name");
    // Extrair valores unicos
    const names = [...new Set((data || []).map(d => d.source_group_name).filter(Boolean))];
    return names as string[];
  },
});
```

### Novo dropdown no filtro (condicional)

```text
{(typeFilter === "grupos" || sourceFilter === "whatsapp_group") && (
  <Select value={groupFilter} onValueChange={(v) => { setGroupFilter(v); setPage(1); }}>
    <SelectTrigger className="w-[200px]">
      <SelectValue placeholder="Grupo" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">Todos os grupos</SelectItem>
      {groupNames.map(name => (
        <SelectItem key={name} value={name}>{name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
)}
```

### Arquivos modificados

- `src/hooks/useLeads.ts` (interface LeadFilters, query de filtro, query de nomes de grupos)
- `src/pages/Leads.tsx` (estado groupFilter, dropdown condicional, filtro nos params)
