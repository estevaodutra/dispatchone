

# Plano: Unificar Logs em Página Única com Abas

## Objetivo

Consolidar as páginas de logs (Sequence Logs + API Logs) em uma única página `/logs` com navegação por abas, paginação adequada e retenção de 72 horas.

---

## Visão Geral da Arquitetura

```text
/logs (página única)
├── Aba "Logs de Envios" (group_message_logs)
│   └── Logs de mensagens de sequências/campanhas
├── Aba "Logs da API" (api_logs)
│   └── Logs de chamadas à API (request/response)
└── Componente de Paginação compartilhado
```

---

## Mudanças Necessárias

### 1. Criar Nova Página Unificada

**Arquivo:** `src/pages/Logs.tsx`

Criar página unificada que:
- Usa o componente `Tabs` do Radix UI
- Contém duas abas: "Logs de Envio" e "Logs da API"
- Exibe banner de retenção de 72 horas
- Implementa paginação no frontend (50 itens por página)

**Estrutura:**
```typescript
<Tabs defaultValue="dispatch">
  <TabsList>
    <TabsTrigger value="dispatch">Logs de Envio</TabsTrigger>
    <TabsTrigger value="api">Logs da API</TabsTrigger>
  </TabsList>
  
  <TabsContent value="dispatch">
    {/* Conteúdo atual de SequenceLogs */}
    <DataTableWithPagination ... />
  </TabsContent>
  
  <TabsContent value="api">
    {/* Conteúdo atual de ApiLogs */}
    <DataTableWithPagination ... />
  </TabsContent>
</Tabs>
```

### 2. Criar Componente DataTableWithPagination

**Arquivo:** `src/components/dispatch/DataTableWithPagination.tsx`

Componente que encapsula o DataTable existente e adiciona:
- Estado de página atual
- Cálculo de páginas totais
- Navegação entre páginas
- Opção de itens por página (25, 50, 100)

**Props:**
```typescript
interface DataTableWithPaginationProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  itemsPerPageOptions?: number[];
  defaultItemsPerPage?: number;
}
```

### 3. Atualizar Hooks para Retenção de 72h

**Arquivo:** `src/hooks/useSequenceLogs.ts`

Adicionar filtro de data para trazer apenas logs das últimas 72 horas:
```typescript
const cutoffDate = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

queryBuilder = queryBuilder
  .gte("sent_at", cutoffDate)
  .order("sent_at", { ascending: false })
  .limit(1000); // Aumentar limite para suportar paginação
```

**Arquivo:** `src/hooks/useApiLogs.ts`

Mesma lógica de 72 horas:
```typescript
const cutoffDate = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

queryBuilder = queryBuilder
  .gte("created_at", cutoffDate)
  .order("created_at", { ascending: false })
  .limit(1000);
```

### 4. Criar Edge Function de Cleanup

**Arquivo:** `supabase/functions/cleanup-logs/index.ts`

Nova função para limpar logs com mais de 72 horas:
- Deleta registros de `group_message_logs` onde `sent_at < 72h`
- Deleta registros de `api_logs` onde `created_at < 72h`
- Retorna contagem de registros deletados

### 5. Configurar Edge Function

**Arquivo:** `supabase/config.toml`

```toml
[functions.cleanup-logs]
verify_jwt = false
```

### 6. Atualizar Rotas e Sidebar

**Arquivo:** `src/App.tsx`

- Remover rotas `/api-logs` e `/sequence-logs`
- Manter rota `/logs` apontando para nova página unificada

**Arquivo:** `src/components/layout/AppSidebar.tsx`

- Remover entrada "Logs de Envio" (`/sequence-logs`)
- Remover entrada "Logs da API" (`/api-logs`)
- Manter "Logs de Despacho" (`/logs`) com nome atualizado para "Logs"

### 7. Atualizar i18n

**Arquivo:** `src/i18n/locales/pt.ts` (e equivalentes)

Adicionar novas chaves:
```typescript
logs: {
  title: "Logs",
  description: "Monitore envios e chamadas da API (retenção de 72h)",
  retentionInfo: "Logs são mantidos por 72 horas",
  tabDispatch: "Logs de Envio",
  tabApi: "Logs da API",
  itemsPerPage: "Itens por página",
  showingPage: "Página {current} de {total}",
}
```

### 8. Remover Páginas Antigas

**Arquivos a remover:**
- `src/pages/SequenceLogs.tsx`
- `src/pages/ApiLogs.tsx`
- `src/pages/DispatchLogs.tsx`

---

## Estrutura de Paginação

A paginação será implementada no frontend:

```typescript
// Estado
const [currentPage, setCurrentPage] = useState(1);
const [itemsPerPage, setItemsPerPage] = useState(50);

// Cálculo
const totalPages = Math.ceil(data.length / itemsPerPage);
const startIndex = (currentPage - 1) * itemsPerPage;
const paginatedData = data.slice(startIndex, startIndex + itemsPerPage);

// UI
<div className="flex items-center justify-between">
  <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(Number(v))}>
    <SelectItem value="25">25</SelectItem>
    <SelectItem value="50">50</SelectItem>
    <SelectItem value="100">100</SelectItem>
  </Select>
  
  <Pagination>
    <PaginationPrevious onClick={() => setCurrentPage(p => Math.max(1, p - 1))} />
    {/* Números de página */}
    <PaginationNext onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} />
  </Pagination>
</div>
```

---

## Comparação Antes/Depois

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Páginas | 3 páginas separadas | 1 página com abas |
| Navegação | `/logs`, `/sequence-logs`, `/api-logs` | `/logs` única |
| Retenção | 24h (API) / Sem limite (Envios) | 72h para ambos |
| Paginação | Sem paginação | 25/50/100 itens por página |
| Cleanup | Apenas webhook_events | + group_message_logs + api_logs |

---

## Fluxo Visual

```text
Sidebar: [Logs] 
           │
           ▼
┌─────────────────────────────────────────────┐
│ Logs                                        │
│ Monitore envios e chamadas da API           │
├─────────────────────────────────────────────┤
│ ⓘ Logs são mantidos por 72 horas           │
├─────────────────────────────────────────────┤
│ [Logs de Envio]  [Logs da API]              │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ Filtros + Busca + Estatísticas         │ │
│ ├─────────────────────────────────────────┤ │
│ │ Tabela de Dados                        │ │
│ │ ...                                    │ │
│ ├─────────────────────────────────────────┤ │
│ │ [25▼] Página 1 de 10 [<] [1] [2] [>]  │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

---

## Resumo de Arquivos

| Arquivo | Ação |
|---------|------|
| `src/pages/Logs.tsx` | Criar (nova página unificada) |
| `src/components/dispatch/DataTableWithPagination.tsx` | Criar (componente com paginação) |
| `src/hooks/useSequenceLogs.ts` | Modificar (filtro 72h + limite 1000) |
| `src/hooks/useApiLogs.ts` | Modificar (filtro 72h + limite 1000) |
| `supabase/functions/cleanup-logs/index.ts` | Criar (cleanup de 72h) |
| `supabase/config.toml` | Modificar (adicionar função cleanup-logs) |
| `src/App.tsx` | Modificar (remover rotas antigas) |
| `src/components/layout/AppSidebar.tsx` | Modificar (simplificar menu) |
| `src/components/dispatch/index.ts` | Modificar (exportar novo componente) |
| `src/i18n/locales/pt.ts` | Modificar (adicionar traduções) |
| `src/i18n/locales/en.ts` | Modificar (adicionar traduções) |
| `src/i18n/locales/es.ts` | Modificar (adicionar traduções) |
| `src/pages/SequenceLogs.tsx` | Remover |
| `src/pages/ApiLogs.tsx` | Remover |
| `src/pages/DispatchLogs.tsx` | Remover |

