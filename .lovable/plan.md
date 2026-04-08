

## Plano: Melhorar Analytics — Movimento de Membros + Enquetes

### Resumo
Reformular a aba Analytics de campanhas de grupo com: filtro de periodo, cards de entrada/saida, grafico de barras de movimento, e analytics detalhados de enquetes usando dados ja existentes nas tabelas `group_member_history`, `poll_messages` e `poll_responses`.

---

### Abordagem de Dados

Em vez de criar novas tabelas como o prompt sugere, vamos aproveitar as tabelas **ja existentes**:
- **`group_member_history`** — ja registra `action` (join/leave/remove/etc) com `member_phone` e `created_at` por campanha
- **`poll_messages`** — ja tem enquetes enviadas com `question_text`, `options`, por campanha
- **`poll_responses`** — ja tem votos com `option_index`, `option_text`, `respondent_phone`

Isso evita migracao de banco e retrabalho no webhook-inbound.

---

### Alteracoes

**1. Migration — Criar funcoes RPC de agregacao**

Criar 2 funcoes SQL:
- `get_member_movement_stats(p_campaign_id UUID, p_days INT)` — agrega dados de `group_member_history` por dia, retornando joins/leaves/saldo
- `get_poll_analytics(p_poll_message_id UUID, p_total_members INT)` — agrega `poll_responses` por opcao, calcula taxa de resposta

**2. Hook — `src/hooks/useMemberMovement.ts`** (novo)

Hook com `useQuery` chamando a RPC `get_member_movement_stats`, recebendo `campaignId` e `period` (7/14/30 dias). Retorna `{ totalJoined, totalLeft, netChange, dailyStats[] }`.

**3. Hook — `src/hooks/usePollAnalytics.ts`** (novo)

Hook com `useQuery` que busca `poll_messages` da campanha e para cada uma busca `poll_responses` agregadas. Retorna array de enquetes com stats por opcao.

**4. Componente — `src/components/group-campaigns/analytics/PeriodFilter.tsx`** (novo)

Toggle buttons para 7/14/30 dias.

**5. Componente — `src/components/group-campaigns/analytics/MemberMovementCard.tsx`** (novo)

- 4 cards: Entraram, Sairam, Saldo, Retencao (usando dados do hook)
- Grafico de barras (Recharts BarChart) com barras verdes (join) e vermelhas (leave) por dia

**6. Componente — `src/components/group-campaigns/analytics/PollAnalyticsCard.tsx`** (novo)

- Card expansivel por enquete
- 4 mini-cards: Total de Votos, Taxa de Resposta, Respondentes Unicos, Opcao mais votada
- Barras de progresso horizontais por opcao com percentual
- Grafico de pizza (PieChart) na expansao
- Botoes: Exportar Votantes, Ver Quem Nao Votou

**7. Reescrever — `src/components/group-campaigns/tabs/AnalyticsTab.tsx`**

Reorganizar layout:
1. PeriodFilter no topo
2. Secao "Visao Geral" — 5 cards (Total Membros, Entraram, Sairam, Saldo, Retencao)
3. Secao "Movimento de Membros" — MemberMovementCard com grafico
4. Secao "Analytics de Enquetes" — lista de PollAnalyticsCard
5. Secao "Engajamento" — manter graficos existentes (Area + Pie)
6. Secao "Exportar" — manter funcionalidade existente

### Arquivos
- Migration SQL (funcoes RPC)
- `src/hooks/useMemberMovement.ts` (novo)
- `src/hooks/usePollAnalytics.ts` (novo)
- `src/components/group-campaigns/analytics/PeriodFilter.tsx` (novo)
- `src/components/group-campaigns/analytics/MemberMovementCard.tsx` (novo)
- `src/components/group-campaigns/analytics/PollAnalyticsCard.tsx` (novo)
- `src/components/group-campaigns/tabs/AnalyticsTab.tsx` (reescrever)

