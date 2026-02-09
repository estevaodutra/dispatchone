
# Plano: Painel de Ligacoes

Este e um recurso complexo com multiplas partes. Vou dividir em etapas claras.

---

## Visao Geral

Criar um painel centralizado para gerenciar todas as ligacoes de todas as campanhas de telefonia, com agendamento automatico, acoes inline e notificacoes sonoras.

---

## Etapa 1: Migracao do Banco de Dados

Adicionar colunas novas nas tabelas existentes:

```sql
-- Campo de intervalo na campanha
ALTER TABLE call_campaigns ADD COLUMN dial_delay_minutes integer DEFAULT 10;

-- Campo de agendamento no log de ligacao
ALTER TABLE call_logs ADD COLUMN scheduled_for timestamptz;
```

O campo `call_status` ja existe em `call_logs`. Os novos valores de status (scheduled, ready, ringing, answered, in_progress, no_answer, busy, cancelled) serao usados como texto -- nao e necessario enum.

---

## Etapa 2: Atualizar Sidebar e Rotas

### Sidebar (`src/components/layout/AppSidebar.tsx`)
- Renomear "Painel" para "Dashboard" no i18n pt (ja e "Dashboard" em en)
- Adicionar item "Painel de Ligacoes" com icone PhoneCall logo abaixo do Dashboard

### i18n (`src/i18n/locales/pt.ts`, `en.ts`, `es.ts`)
- Adicionar chave `nav.callPanel` = "Painel de Ligacoes" / "Call Panel" / "Panel de Llamadas"

### Rota (`src/App.tsx`)
- Adicionar rota `/painel-ligacoes` protegida com AppLayout

---

## Etapa 3: Campo "Intervalo para Ligacao" na Campanha

### Hook (`src/hooks/useCallCampaigns.ts`)
- Adicionar `dialDelayMinutes: number` ao tipo `CallCampaign`
- Mapear `dial_delay_minutes` no transform

### ConfigTab (`src/components/call-campaigns/tabs/ConfigTab.tsx`)
- Adicionar campo Input numerico "Intervalo para Ligacao (minutos)"
- Incluir no `handleSave` e `hasChanges`

---

## Etapa 4: Atualizar Edge Function `call-dial`

### `supabase/functions/call-dial/index.ts`
- Buscar `dial_delay_minutes` da campanha
- Calcular `scheduled_for = now() + dial_delay_minutes`
- Inserir `scheduled_for` e `call_status: 'scheduled'` no call_log (em vez de 'dialing' imediato)
- Atualizar lead status para `'scheduled'` em vez de `'calling'`
- Incluir `scheduled_for` e `dial_in_minutes` na resposta

---

## Etapa 5: Hook de Ligacoes Global

### Novo arquivo: `src/hooks/useCallPanel.ts`

Hook que busca todas as ligacoes (de todas as campanhas) com joins:

```typescript
// Busca call_logs com dados do lead e campanha
// Filtros: status, campaign_id, data, busca por nome/telefone
// Estatisticas: contagem por status
// Mutations: delay (+10 min), reschedule, cancel, dial-now, register action
```

Queries usarao `supabase.from('call_logs').select('*, call_leads(*), call_campaigns(name)')`.

Acoes do painel:
- **+10 min**: `update call_logs set scheduled_for = scheduled_for + interval '10 minutes' where id = X`
- **Reagendar**: `update call_logs set scheduled_for = <nova_data> where id = X`
- **Cancelar**: `update call_logs set call_status = 'cancelled', notes = <motivo> where id = X` + atualizar lead
- **Ligar Agora**: `update call_logs set scheduled_for = now(), call_status = 'ready' where id = X` + disparar webhook
- **Acao**: Buscar acoes da campanha, executar automacao (reusar `executeActionAutomation`)

---

## Etapa 6: Pagina do Painel de Ligacoes

### Novo arquivo: `src/pages/CallPanel.tsx`

Estrutura da pagina:

1. **Header**: Titulo + descricao
2. **Cards de metricas**: Agendadas, Em Andamento, Concluidas, Canceladas
3. **Filtros**: Busca por nome/telefone, filtro por campanha, filtro por status, filtro por data
4. **Lista de ligacoes**: Cards individuais com informacoes e acoes

### Card de Ligacao -- Layout por status:

**Agendada (scheduled/ready):**
- Contador regressivo ate `scheduled_for`
- Nome, telefone, campanha
- Botoes: [+10 min] [Reagendar] [Cancelar] [Ligar Agora] [Acao]

**Em andamento (dialing/ringing/answered/in_progress):**
- Indicador de duracao
- Nome, telefone, campanha, operador
- Botoes: [Abrir Roteiro] [Acao]

**Concluida (completed):**
- Duracao total
- Nome, telefone, campanha, tag de resultado
- Botao: [Ver Detalhes]

**Falha (no_answer/busy/failed):**
- Tentativas
- Nome, telefone, campanha
- Botoes: [Reagendar] [Ver Detalhes] [Acao]

### Dialogs auxiliares:
- **Reagendar**: Date picker + time input + atalhos rapidos (+10min, +30min, +1h, amanha)
- **Cancelar**: Confirmacao com campo de motivo
- **Acao**: Lista as acoes da campanha, campo de notas, executa automacao

---

## Etapa 7: Notificacoes Sonoras e Visuais

Dentro de `CallPanel.tsx`:

1. **Permissao**: Solicitar `Notification.permission` ao montar o componente. Botao "Ativar Notificacoes" se permission === 'default'
2. **Polling**: `useEffect` com `setInterval` a cada 30s para refetch das ligacoes
3. **Contadores locais**: `useEffect` com `setInterval` a cada 1s para atualizar contadores regressivos
4. **Alerta 1 min antes**: Quando `scheduled_for - now() <= 60s`:
   - Tocar som de alerta (usar `new Audio()` com um tom gerado via Web Audio API, sem necessidade de arquivo MP3)
   - Enviar `new Notification()` se permitido
   - Destacar card com borda vermelha piscante (animacao CSS `animate-pulse`)
   - Mostrar botao grande "INICIAR LIGACAO"

---

## Etapa 8: Realtime (Opcional/Futuro)

Habilitar realtime na tabela `call_logs` para atualizacoes em tempo real:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_logs;
```
Isso sera adicionado na migracao para uso futuro mas o polling sera a implementacao inicial.

---

## Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| Migracao SQL | Criar (dial_delay_minutes + scheduled_for + realtime) |
| `src/i18n/locales/pt.ts` | Modificar (adicionar callPanel) |
| `src/i18n/locales/en.ts` | Modificar (adicionar callPanel) |
| `src/i18n/locales/es.ts` | Modificar (adicionar callPanel) |
| `src/components/layout/AppSidebar.tsx` | Modificar (renomear + novo item) |
| `src/App.tsx` | Modificar (nova rota) |
| `src/hooks/useCallCampaigns.ts` | Modificar (dialDelayMinutes) |
| `src/components/call-campaigns/tabs/ConfigTab.tsx` | Modificar (campo intervalo) |
| `supabase/functions/call-dial/index.ts` | Modificar (agendamento) |
| `src/hooks/useCallPanel.ts` | Criar |
| `src/pages/CallPanel.tsx` | Criar |

---

## Ordem de Implementacao

1. Migracao do banco
2. Atualizar tipos e hooks (useCallCampaigns)
3. Campo intervalo no ConfigTab
4. Atualizar edge function call-dial
5. Criar hook useCallPanel
6. Criar pagina CallPanel com cards, filtros, dialogs e acoes
7. Atualizar sidebar e rotas
8. Notificacoes sonoras
