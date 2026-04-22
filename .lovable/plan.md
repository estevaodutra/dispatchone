

## Plano: Sistema de Agendamento — PARTE 3/4 (Analytics + Configurações)

Escopo: painel de Analytics completo com agregações server-side via RPCs, e página de Configurações globais de Agendamentos (domínio personalizado, fuso, integrações placeholder, branding, webhook global, notificações padrão).

### Modelo de dados

Tabelas novas:

- **`scheduling_settings`** — configurações globais por company (1:1)
  - `id`, `company_id` (unique), `default_timezone` (default `America/Sao_Paulo`), `custom_domain` (text, nullable), `custom_domain_status` (`pending`|`verified`|`error`), `custom_domain_verified_at`, `hide_branding` (boolean), `webhook_global_enabled` (boolean), `webhook_global_url` (text), `default_whatsapp_instance_id` (uuid), `send_email_confirmation` (boolean), `send_ics_invite` (boolean), `created_at`, `updated_at`
  - RLS: `is_company_member` para SELECT, `is_company_admin` para UPSERT/UPDATE

- **`scheduling_global_integrations`** — integrações OAuth placeholder por company
  - `id`, `company_id`, `provider` (`google_calendar`|`outlook`|`zoom`|`google_meet`), `is_connected`, `account_email`, `config` (jsonb), `connected_at`
  - Unique `(company_id, provider)`, RLS via `is_company_admin`

Coluna adicional em `scheduling_calendars`:
- `view_count` (integer, default 0) — incrementado por RPC pública `increment_calendar_view(slug)` usada pelo `BookingLayout` (PARTE 2) para medir visitantes

### RPCs de Analytics (SECURITY DEFINER, escopo por `company_id`)

Todas validam `is_company_member(company_id, auth.uid())` e recebem filtros `(company_id uuid, calendar_id uuid null, attendant_id uuid null, from_date date, to_date date)`:

- **`get_scheduling_overview`** → `{ conversion_rate, conversion_prev, appointments_total, appointments_prev, cancellations_total, cancellations_prev, no_shows_total, no_shows_prev }` (período atual vs imediatamente anterior de mesma duração)
- **`get_scheduling_by_day`** → `[{ day date, total int }]` agregando `scheduling_appointments` por `scheduled_start::date`
- **`get_scheduling_heatmap`** → `[{ dow int, hour int, total int }]` (segunda–sexta, 08–17h por padrão)
- **`get_scheduling_attendant_performance`** → join com `scheduling_attendants`: `[{ attendant_id, name, photo_url, total, completed, no_shows, success_rate }]`
- **`get_scheduling_sources`** → agrupa por `utm_source`/`utm_medium` com fallback `"direct"`, retorna `[{ source, total, pct }]`
- **`get_scheduling_funnel`** → `{ visits, slot_selected, details_filled, confirmed }` — `visits` vem de `scheduling_calendars.view_count`; `slot_selected`/`details_filled` derivados de contadores incrementais (ver abaixo); `confirmed` de `scheduling_appointments`
- **`get_scheduling_cancel_reasons`** → `[{ reason, total, pct }]` agrupando `scheduling_appointments.cancel_reason`

Para o funil, adicionar colunas a `scheduling_calendars`: `slot_select_count` e `details_submit_count` (int default 0), incrementados pelas páginas públicas `BookingSelectSlot` (ao avançar) e `BookingDetails` (ao enviar) via RPCs `increment_calendar_slot_select(slug)` e `increment_calendar_details_submit(slug)`.

### Arquivos a criar

```
src/
├── pages/scheduling/
│   ├── AnalyticsPage.tsx                (orquestra filtros + chama hooks)
│   └── SchedulingSettingsPage.tsx       (configurações globais)
├── components/scheduling/analytics/
│   ├── AnalyticsFilters.tsx             (período/calendário/atendente)
│   ├── OverviewCards.tsx                (4 cards com deltas)
│   ├── AppointmentsByDayChart.tsx       (recharts BarChart)
│   ├── HourHeatmap.tsx                  (grid 5x10 com gradiente)
│   ├── AttendantPerformanceTable.tsx    (ordenável)
│   ├── SourcesChart.tsx                 (barras horizontais)
│   ├── ConversionFunnel.tsx             (funil vertical customizado)
│   └── CancelReasonsChart.tsx           (pizza recharts)
├── components/scheduling/settings/
│   ├── CustomDomainCard.tsx             (input + status badge + verificação)
│   ├── DefaultTimezoneCard.tsx
│   ├── GlobalIntegrationsCard.tsx       (4 cards placeholder "Em breve")
│   ├── BrandingCard.tsx
│   ├── GlobalWebhookCard.tsx
│   └── NotificationDefaultsCard.tsx
└── hooks/
    ├── useSchedulingAnalytics.ts        (overview, byDay, heatmap, performance, sources, funnel, cancelReasons)
    └── useSchedulingSettings.ts         (load/upsert settings + integrations)
```

Atualizar:
- `src/pages/scheduling/SchedulingLayout.tsx` — habilitar abas "Analytics" e "Configurações"
- `src/App.tsx` — rotas `/agendamentos/analytics` e `/agendamentos/configuracoes`
- `src/pages/public/BookingLayout.tsx` — chamar `increment_calendar_view` em mount (1x por session via sessionStorage)
- `src/pages/public/BookingSelectSlot.tsx` — chamar `increment_calendar_slot_select` ao confirmar slot
- `src/pages/public/BookingDetails.tsx` — chamar `increment_calendar_details_submit` ao submeter
- `src/i18n/locales/{pt,en,es}.ts` — chaves `scheduling.analytics.*` e `scheduling.settings.*`

### Decisões técnicas

- **Agregações server-side**: todos os números vêm de RPCs para evitar baixar milhares de linhas; único SELECT direto do cliente é a lista de calendários/atendentes para preencher filtros
- **Período anterior**: calculado na RPC como `[from_date - (to_date - from_date) - 1, from_date - 1]` para comparação justa
- **Heatmap**: grid fixo Seg–Sex × 08h–17h (10 colunas) conforme spec "5x8" ampliado para cobrir jornada comercial; intensidade via opacidade de `hsl(var(--primary))`; células com 0 agendamentos ficam `bg-muted`
- **Funil**: componente custom (SVG ou divs com `clip-path`) — sem nova dependência; mostra % de cada etapa em relação à anterior e conversão geral destacada no topo
- **Sources**: `utm_source` ausente → agrupa como `"direct"`; normaliza para `whatsapp`/`email`/`direct`/`other` no cliente
- **Motivos de cancelamento**: mapeia os 4 presets da PARTE 2 (`schedule_conflict`, `no_longer_needed`, `will_reschedule`, `other`) + registros null → `not_informed`
- **Domínio personalizado**: campo `custom_domain` é apenas armazenamento declarativo por ora. Status `pending` na criação; botão "Verificar DNS" chama nova edge function `verify-scheduling-domain` que faz `fetch` a `https://dns.google/resolve?name={domain}&type=CNAME` e marca `verified` se `custom.dispatchone.com` estiver no resultado. Sem emissão de SSL nesta parte (fica para PARTE 4 junto com Lovable Custom Domains API)
- **Integrações globais**: 4 cards "Conectar" desabilitados com badge "Em breve". Tabela `scheduling_global_integrations` já criada para o OAuth real da PARTE 4
- **Branding "hide_branding"**: quando `true`, `BookingLayout` (PARTE 2) já lê `layout.hide_branding` do calendário — aqui adicionamos fallback ao valor global da company
- **Webhook global**: toggle + URL; quando `scheduling_integrations.webhook_*_url` do calendário estiver vazio, o disparador (PARTE 4) usará o global
- **Instância WhatsApp padrão**: select popula de `useInstances()` filtrando por company; usado como fallback nas notificações que não têm instância própria
- **i18n**: PT/EN/ES
- **Charts**: reusa `recharts` já presente (`src/components/ui/chart.tsx`) — sem nova dependência

### Comportamento final

- Aba Analytics mostra 4 cards com deltas vs período anterior, gráficos preenchidos com dados reais de `scheduling_appointments` agregados por RPC, e filtros que recarregam via React Query keys `(range, calendar, attendant)`
- Funil começa a fazer sentido assim que usuários acessarem páginas públicas (contadores incrementais em `scheduling_calendars`)
- Aba Configurações permite salvar domínio personalizado (com verificação DNS básica), fuso padrão, toggles de branding e notificações, instância WhatsApp padrão, webhook global, e exibe placeholders para integrações OAuth
- Sidebar de `/agendamentos/*` com as 5 abas totalmente navegáveis

### Fora desta parte (PARTE 4)

- Envio real de WhatsApp de confirmação/lembretes
- OAuth real Google Calendar/Outlook/Zoom/Meet + criação automática de evento e link de reunião
- Disparo real de webhooks globais/por-calendário
- Emissão SSL + roteamento DNS do custom domain (Lovable Custom Domains API)
- Criação automática de lead na campanha de ligação ao confirmar agendamento
- Cron de lembretes (1 dia / 1 hora / 15 min antes)

