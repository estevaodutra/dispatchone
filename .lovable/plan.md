

## Plano: Ajustes no Painel de Ligações

### 1. Adicionar filtro de status (dropdown)
**`src/pages/CallPanel.tsx`**:
- Adicionar estado `statusDropdownFilter` (default `"all"`)
- Adicionar `<Select>` ao lado do filtro de campanhas com opções: Todos os status, Agendada, AGORA!, Em Andamento, Atendida, Não Atendeu, Reagendada, Aguardando Operador
- Passar esse filtro para `useCallPanel` ou filtrar client-side nos `sortedEntries`

### 2. Adicionar filtro de data (date range picker)
**`src/pages/CallPanel.tsx`**:
- Adicionar estados `dateFrom` e `dateTo`
- Usar `Popover` + `Calendar` com atalhos rápidos (Hoje, Ontem, 7 dias, Este mês, Limpar)
- Filtrar entries client-side por `createdAt` dentro do range selecionado

### 3. Alterar formato da coluna "Entrada"
**`src/pages/CallPanel.tsx`** (linha ~908):
- Mudar `format(new Date(entry.createdAt), "HH:mm")` para `format(new Date(entry.createdAt), "dd/MM/yyyy HH:mm:ss")`
- Ajustar largura da coluna `Entrada` de `w-[70px]` para `w-[160px]`

### 4. Reorganizar abas (remover Falhas/Canceladas, adicionar Histórico)
**`src/pages/CallPanel.tsx`** (linhas ~761-773):
- Remover `TabsTrigger` de "Falhas" e "Canceladas"
- Adicionar `TabsTrigger` "Histórico" com valor `"history"`
- Adicionar lógica: quando `statusFilter === "history"`, buscar `call_logs` com status terminais (`completed`, `no_answer`, `busy`, `voicemail`, `failed`, `cancelled`, `timeout`, `max_attempts_exceeded`) ordenados por `ended_at DESC`

### 5. Implementar aba "Histórico"
**`src/pages/CallPanel.tsx`**:
- Adicionar query separada via `useQuery` para buscar logs com status terminais (sem deduplicação, sem limite de 200)
- Renderizar tabela com colunas: Entrada (data completa), Status (badge colorido), Lead, Telefone, Campanha, Duração, Operador, Ações
- Respeitar filtros de campanha, busca e data

### 6. Badges de status para o Histórico
**`src/pages/CallPanel.tsx`**:
- Criar componente `HistoryStatusBadge` com mapeamento:
  - `completed` → verde "Atendida"
  - `no_answer` → laranja "N/Atendeu"
  - `busy` → vermelho "Ocupado"
  - `voicemail` → amarelo "Cx. Postal"
  - `failed` → vermelho "Falhou"
  - `cancelled` → cinza "Cancelada"
  - `timeout` → cinza "Timeout"
  - `max_attempts_exceeded` → vermelho escuro "Esgotado"

### 7. Atualizar `useCallPanel`
**`src/hooks/useCallPanel.ts`**:
- Adicionar suporte a filtro `dateFrom`/`dateTo` (range) no query, usando `gte`/`lte` em `created_at`
- Adicionar status `"history"` ao switch de status para buscar os status terminais

