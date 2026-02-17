

# Seletor de linhas por pagina no Painel de Ligacoes

## Situacao atual

- O painel ja possui filtro por campanha (Select) e filtro por status (abas) -- ambos funcionando
- A paginacao esta fixa em 20 itens por pagina (constante `ITEMS_PER_PAGE = 20` na linha 365)
- Os controles de paginacao sao basicos (Anterior / Proxima)

## O que sera alterado

### Arquivo: `src/pages/CallPanel.tsx`

1. **Trocar constante por estado**: Substituir `const ITEMS_PER_PAGE = 20` por um `useState` com valor inicial 50 e opcoes de 25, 50 e 100

2. **Adicionar seletor de itens por pagina**: Incluir um Select ao lado dos controles de paginacao com as opcoes 25, 50 e 100, que reseta para pagina 1 ao mudar

3. **Melhorar controles de paginacao**: Adicionar indicador de intervalo (ex: "1-50 de 120") junto ao seletor

### Detalhes tecnicos

**Linha 365** - Trocar constante por estado:
```typescript
// De:
const ITEMS_PER_PAGE = 20;

// Para:
const [itemsPerPage, setItemsPerPage] = useState(50);
```

**Linhas 456-460** - Adicionar `itemsPerPage` ao reset de pagina:
```typescript
useEffect(() => {
  setCurrentPage(1);
  setSelectedIds(new Set());
}, [statusFilter, campaignFilter, searchQuery, itemsPerPage]);
```

**Linhas 466-471** - Atualizar calculos de paginacao para usar `itemsPerPage` em vez de `ITEMS_PER_PAGE`

**Linhas 900-915** - Substituir controles de paginacao simples por versao com seletor:
```
[Itens por pagina: [25 | 50 | 100]]   (1-50 de 120)   [< Anterior] Pagina 1 de 3 [Proxima >]
```

Nenhuma mudanca de logica de negocio, banco de dados ou edge functions.
