

# Selecionar todos os leads do filtro ao clicar no checkbox superior

## Resumo

Atualmente, o checkbox superior seleciona apenas os 20 leads da pagina atual. O comportamento desejado e que, quando houver filtros aplicados, o checkbox superior selecione automaticamente **todos os leads que correspondem ao filtro** (ex: todos os 933), nao apenas os da pagina visivel.

## Mudancas

### 1. `src/pages/Leads.tsx` -- funcao `toggleAll`

Alterar a logica do checkbox superior para que, ao marcar, ele ative o modo `selectAllResults` automaticamente (selecionando todos os resultados do filtro), em vez de selecionar apenas os IDs da pagina atual.

- Ao marcar: setar `selectAllResults = true` e tambem marcar os leads visiveis na pagina (para feedback visual)
- Ao desmarcar: limpar tudo (`selectedIds` e `selectAllResults`)

### 2. `src/pages/Leads.tsx` -- estado do checkbox

Atualizar a propriedade `checked` do checkbox superior para refletir o estado `selectAllResults` tambem, nao apenas a comparacao com `leads.length`.

### 3. `src/components/leads/BulkActionsBar.tsx`

Quando `selectAllResults` ja estiver ativo, esconder o botao "Selecionar todos os X" pois ja estao todos selecionados.

## Detalhes tecnicos

### toggleAll atualizado

```text
const toggleAll = () => {
  if (selectAllResults || selectedIds.size === leads.length) {
    // Desmarcar tudo
    setSelectedIds(new Set());
    setSelectAllResults(false);
  } else {
    // Selecionar todos os resultados do filtro
    setSelectedIds(new Set(leads.map((l) => l.id)));
    setSelectAllResults(true);
  }
};
```

### Checkbox checked

```text
<Checkbox
  checked={selectAllResults || (leads.length > 0 && selectedIds.size === leads.length)}
  onCheckedChange={toggleAll}
/>
```

### Arquivos modificados

- `src/pages/Leads.tsx` (toggleAll, checkbox state)

