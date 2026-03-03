

## Reestruturação do Painel de Ligações: 6 abas para 4 abas

### Resumo

Reescrever o componente `CallPanel.tsx` (~2170 linhas) para substituir as 6 abas confusas (Todas, Agendadas, Em Andamento, Atendidas, Histórico, Fila) por 4 abas claras e objetivas, com controles unificados no topo.

### Estrutura das Novas Abas

| Aba | Fonte de Dados | Status |
|-----|---------------|--------|
| **Fila** (padrão) | `call_queue` + `call_logs` scheduled/ready | waiting, scheduled, ready |
| **Em Andamento** | `call_logs` | dialing, ringing, answered, in_progress |
| **Atendidas** | `call_logs` (hoje) | completed com answered_at |
| **Histórico** | `call_logs` (todos finais) | completed, no_answer, busy, failed, cancelled, etc. |

### Mudanças Técnicas

**Arquivo: `src/pages/CallPanel.tsx`** (reescrita significativa)

1. **Remover as 6 abas internas** (linhas 972-984: TabsList com "Todas", "Agendadas", "Em Andamento", "Atendidas", "Histórico", "Fila")

2. **Substituir por 4 abas novas** com contadores:
   - `queue` — Fila (contagem do `totalWaiting` + scheduled)
   - `in_progress` — Em Andamento (contagem de dialing/ringing/on_call)
   - `answered` — Atendidas (nova query: completed hoje)
   - `history` — Histórico (query existente já funciona)

3. **Bloco de Status + Controles no topo** (acima das abas):
   - 4 MetricCards: Na Fila, Em Andamento, Atendidas (hoje), Operadores disponíveis
   - Bloco de controles unificado: Iniciar/Pausar/Parar fila, Adicionar à fila, Limpar fila
   - Banner de status da fila (reutilizar QueueStatusBanner simplificado)

4. **Aba Fila** (nova aba padrão):
   - Combinar dados de `call_queue` (waiting) + `call_logs` (scheduled/ready)
   - Tabela com colunas: #, Lead, Telefone, Campanha, Tentativa, Agendado, Ações
   - Ícones: calendario para agendadas, raio para prioritárias
   - Ações por item: Discar manual, Remover da fila

5. **Aba Em Andamento**:
   - Formato de cards (não tabela) para chamadas ativas
   - Cada card: nome, telefone, campanha, operador, timer ao vivo, status badge
   - Status badges: Discando (azul), Chamando (amarelo), Em Linha (verde)

6. **Aba Atendidas**:
   - Nova query dedicada: `call_logs` WHERE `call_status = 'completed'` AND `answered_at IS NOT NULL` AND `created_at >= hoje`
   - Tabela: Lead, Telefone, Campanha, Operador, Duração, Ação, Horário

7. **Aba Histórico** (manter query existente):
   - Adicionar filtro de status final (atendida, não atendeu, ocupado, falhou)
   - Adicionar filtro de operador
   - Manter filtros de período e campanha existentes

**Estado removido:**
- `statusFilter` (antes: "all"/"scheduled"/"in_progress"/"completed"/"history"/"queue") → substituído por `activeTab` ("queue"/"in_progress"/"answered"/"history")
- `statusDropdownFilter` — removido (cada aba já filtra por status)
- O `panelTab` superior (Ligações/Operadores/Configurações) permanece

**Componentes reutilizados:**
- `QueueStatusBanner` — simplificado e movido para o bloco de controles
- `HistoryStatusBadge` — reutilizado na aba Histórico
- `ActionDialog` — sem mudanças
- `MetricCard` — sem mudanças
- Todos os dialogs (Reschedule, Cancel, EditOperator, BulkOperator, CreateQueue) — sem mudanças

### Estimativa de Impacto

- **1 arquivo principal**: `src/pages/CallPanel.tsx` — reescrita parcial (~40% do arquivo muda)
- **Nenhuma mudança de banco** — todas as queries usam tabelas existentes
- **Nenhum hook novo** — reutiliza `useCallPanel`, `useCallQueue`, `useCallOperators`
- **Nova query inline** para "Atendidas hoje" (similar à existente de history)

