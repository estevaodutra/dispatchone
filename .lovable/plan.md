

## Plano: Modal "Criar Fila de Ligações" na aba Fila

### Contexto

A aba "Fila" no `CallPanel.tsx` (linha 1033) mostra "Nenhum lead na fila." quando vazia, sem nenhuma ação. O objetivo é adicionar um botão "Criar Fila" no empty state e "Adicionar Leads" no header quando há itens, ambos abrindo um modal completo com filtros.

### Estrutura de dados relevante

- `call_leads`: `status`, `attempts`, `custom_fields` (JSON com `.tags`), `campaign_id`, `created_at`, `name`, `phone`
- `call_queue`: destino dos leads filtrados
- `addToQueue` já existe em `useCallQueue` mas trabalha com `leadIds` — será reutilizado/adaptado

### Alterações

**1. Criar `src/components/call-panel/CreateQueueDialog.tsx`** (~400 linhas)

Novo componente com o modal completo em 4 passos:

- **Passo 1 — Campanha**: `Select` com campanhas de `useCallCampaigns()`, mostrando contagem de leads (query auxiliar)
- **Passo 2 — Filtros**: 
  - Status multi-select via checkboxes: `pending`, `no_answer`, `completed`, `failed`, `cancelled` (mapeados para os status reais do `call_leads`)
  - Tags multi-select: query `call_leads` da campanha selecionada, extrai tags únicas de `custom_fields->tags`
- **Passo 3 — Quantidade e Ordem**: Radio `todos` vs `limitar` + Input numérico; Radio de ordenação (`created_at desc/asc`, `attempts asc`, random)
- **Passo 4 — Opções**: Checkboxes para `isPriority`, `autoStart`, `ignoreExisting`
- **Prévia**: Cards mostrando campanha, filtrados, serão adicionados, já na fila (query reativa)
- **Submissão**: 
  1. Busca leads filtrados do `call_leads` com os filtros aplicados
  2. Se `ignoreExisting`, exclui phones já em `call_queue` para a campanha
  3. Insere em batches no `call_queue` via insert direto (não usa `addToQueue` do hook que é por leadId)
  4. Se `autoStart`, chama `startQueue(campaignId)`
  5. Mostra resultado com contagem de adicionados/ignorados
  6. Botões: "Criar Outra", "Iniciar Fila", "Fechar"

**2. Atualizar `src/pages/CallPanel.tsx`**

- Linha 1033: Substituir o empty state por um componente com ícone, texto e botão "Criar Fila de Ligações"
- Linha 1037 (banner da fila): Adicionar botão "Adicionar Leads" ao lado dos controles existentes
- Importar e renderizar `CreateQueueDialog` com estado `showCreateQueue`
- Passar `startQueue` do `useCallQueue` para o dialog para auto-iniciar

### Detalhes técnicos

- Tags no `call_leads` estão em `custom_fields->>tags` (JSONB), a query usará `.not("custom_fields->tags", "is", null)` e extração client-side
- A contagem de prévia será feita com `select("id", { count: "exact", head: true })` para performance
- Inserção em batch: chunks de 50 leads para evitar timeout
- O progress bar durante criação usa estado local `(current/total) * 100`

