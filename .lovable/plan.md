

## Plano: Sistema de Agendamento — PARTE 4/4 (Integrações Reais, Webhooks, Lembretes, Automação)

Esta é a última parte: conecta todo o sistema ao mundo real. WhatsApp de confirmação/lembretes, webhooks de ciclo de vida, criação automática de lead em campanha de ligação, geração de link de reunião e um OAuth placeholder evoluído para Google Calendar.

As partes 1–3 já cobriram as tabelas, a jornada pública, a gestão administrativa, analytics e configurações globais. Esta parte **não recria** esse modelo — apenas acrescenta automações.

### Novas edge functions

```
supabase/functions/
├── scheduling-dispatch/       (roteador: reage a INSERT/UPDATE em scheduling_appointments)
├── scheduling-reminders/      (cron: 1d / 1h / 15min antes)
├── scheduling-webhook-fire/   (dispara webhooks do calendário + global)
└── scheduling-google-oauth/   (inicia + callback OAuth Google Calendar/Meet — por company)
```

Todas seguem os padrões do projeto: CORS, Zod nos inputs, casting explícito de erros, autenticação via `getUser(token)` quando aplicável, e `verify_jwt = false` só nas rotas públicas (`scheduling-google-oauth` callback).

### Nova coluna + novos jobs

- `scheduling_appointments` ganha:
  - `confirmation_sent_at timestamptz`
  - `reminder_1d_sent_at timestamptz`
  - `reminder_1h_sent_at timestamptz`
  - `reminder_15m_sent_at timestamptz`
  - `google_event_id text` (criação em Google Calendar)
  - `call_lead_id uuid` (quando o lead foi criado em campanha de ligação)

- `scheduling_global_integrations` ganha colunas reais de OAuth: `access_token`, `refresh_token`, `token_expires_at`, `external_account_id`.

- **Trigger** `on_scheduling_appointment_changed` → chama `scheduling-dispatch` via `pg_net` quando há INSERT/UPDATE de status (`confirmed`, `cancelled`, `rescheduled`, `completed`, `no_show`).

- **Cron** (pg_cron + pg_net) a cada **5 minutos** invoca `scheduling-reminders`.

### `scheduling-dispatch` (motor central)

Recebe um `appointment_id` e decide o que disparar com base no novo status:

1. **Confirmação** (status virou `confirmed` e `confirmation_sent_at IS NULL`):
   - Lê `scheduling_notifications` do calendário + fallback para `scheduling_settings.default_whatsapp_instance_id`
   - Renderiza template com variáveis `{{lead.name}}`, `{{appointment.date}}`, `{{appointment.time}}`, `{{calendar.name}}`, `{{attendant.name}}`, `{{appointment.manage_link}}`, `{{appointment.meeting_url}}`
   - Envia via `execute-message` (motor existente) apontando para a instância resolvida e `targetPhones: [lead_phone]`
   - Marca `confirmation_sent_at = now()`
   - Registra evento `confirmation_sent` em `scheduling_appointment_events`

2. **Criação de lead em campanha de ligação** (se `scheduling_integrations.call_campaign_enabled`):
   - Se `call_campaign_timing = immediate`: cria em `leads` + insere em `call_queue` com `position=0`
   - Se `scheduled`: cria em `leads` e insere em `call_queue` com `scheduled_for = scheduled_start`
   - Guarda `call_lead_id` no appointment

3. **Link de reunião** (modalidade = `video`, `video_auto_link = true`):
   - Se company tem `google_calendar` conectado em `scheduling_global_integrations` → chama Google Calendar API (via `connector-gateway.lovable.dev/google_calendar/...`) para criar evento com `conferenceData.createRequest` → extrai `hangoutLink` → salva em `meeting_url` e `google_event_id`
   - Zoom fica como placeholder (cria `meeting_url` manual quando admin preencher — igual hoje)
   - Se sem integração: deixa `meeting_url` vazio (comportamento atual mantém)

4. **Webhooks** (chama `scheduling-webhook-fire`):
   - `agendamento_criado` quando status = `confirmed` e é INSERT
   - `agendamento_cancelado` quando `cancelled`
   - `agendamento_reagendado` quando `rescheduled_from_id IS NOT NULL`
   - `agendamento_concluido` quando `completed`
   - Prioriza URL do calendário (`scheduling_integrations.webhook_*_url`); fallback para `scheduling_settings.webhook_global_url` se `webhook_global_enabled`
   - Payload JSON padronizado com o appointment + calendar + attendant + lead

5. **Google Calendar sync de cancelamento** (se `google_event_id IS NOT NULL` e status = `cancelled`/`rescheduled`): chama `DELETE /calendars/primary/events/{id}`

### `scheduling-reminders` (cron a cada 5 min)

Consulta appointments `confirmed` onde `scheduled_start` entra nas janelas `[now+23h55m, now+24h5m]`, `[now+55m, now+1h5m]`, `[now+10m, now+20m]` e o respectivo `reminder_*_sent_at IS NULL` + o template correspondente está `enabled` no `scheduling_notifications` do calendário.

Para cada hit:
- Renderiza template, dispara via `execute-message`
- Marca o respectivo `reminder_*_sent_at`
- Registra `reminder_sent` em events com payload `{ kind: '1d'|'1h'|'15m' }`

Usa paginação por `id > last_id` (padrão do projeto) para não perder registros em volumes altos.

### `scheduling-webhook-fire`

Recebe `{ appointment_id, event_name, target_url }`. Monta payload:

```json
{
  "event": "appointment_confirmed",
  "timestamp": "...",
  "appointment": { "id","status","scheduled_start","scheduled_end","modality","meeting_url","cancel_token","manage_link" },
  "calendar": { "id","name","slug","color" },
  "attendant": { "id","name","email" },
  "lead": { "name","phone","email","custom_fields","answers" },
  "utm": { "source","medium","campaign" }
}
```

Faz `POST` com timeout 10s; em falha, grava em `webhook_events` (tabela já existente) com `processing_error` para reenfileirar.

### `scheduling-google-oauth` (OAuth real)

- `GET /scheduling-google-oauth/start?company_id=...` → gera state, redireciona para `accounts.google.com/o/oauth2/v2/auth` com escopos `calendar.events` + `calendar.readonly`
- `GET /scheduling-google-oauth/callback` (verify_jwt=false) → troca code por tokens, grava em `scheduling_global_integrations` com `provider='google_calendar'`, `is_connected=true`, redireciona para `/agendamentos/configuracoes?connected=google`
- Secrets necessários: `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`

Se o usuário preferir não configurar OAuth próprio, o sistema pode usar a integração `google_calendar` via **Lovable Connectors** (connector-gateway) — nesse caso é a conta do desenvolvedor, aceitável para uma única company. O plano implementa OAuth próprio por company como padrão; o connector fica como opção secundária documentada.

### Alterações no frontend

- **`GlobalIntegrationsCard`** (PARTE 3): Google Calendar e Google Meet deixam de ser "Em breve" — passam a mostrar:
  - Se desconectado: botão "Conectar" → abre `scheduling-google-oauth/start` em nova aba
  - Se conectado: badge verde + email da conta + botão "Desconectar" (atualiza `is_connected=false`, zera tokens)
  - Outlook e Zoom continuam placeholders "Em breve"

- **`AppointmentDetailsDialog`** (PARTE 2): 
  - Seção "Histórico" passa a exibir eventos reais alimentados automaticamente (já vem de graça — `scheduling_appointment_events` agora é preenchido pelos fluxos automáticos)
  - Ao marcar `completed`/`no_show`/`cancelled` o trigger dispara `scheduling-dispatch` — sem mudança no frontend, só aproveita

- **`NotificationsTab`** (PARTE 1): dica nova "Lembretes são enviados automaticamente quando o toggle estiver ativo"

- **`CustomDomainCard`** (PARTE 3): passa a incluir, quando `verified`, instrução de como **adicionar o domínio como custom domain do projeto Lovable** (link para Project Settings) — SSL é gerenciado pelo Lovable, não pelo nosso backend. Mantém a verificação DNS básica já existente.

### Fluxo final end-to-end

1. Lead acessa `/agendar/{slug}` → escolhe atendente (se aplicável) → slot → qualificação → dados → confirma
2. `create_public_appointment` insere → trigger → `scheduling-dispatch`
3. Dispatch envia WhatsApp de confirmação, cria lead em campanha (se configurado), gera link Meet (se Google conectado), dispara webhook "criado"
4. Cron de lembretes encontra o appointment e envia nas 3 janelas conforme toggles do calendário
5. Lead clica em "Gerenciar" no WhatsApp → pode reagendar ou cancelar → trigger dispara webhook correspondente + atualiza Google Calendar
6. No dia, admin marca `completed`/`no_show` → webhook correspondente dispara
7. Analytics da PARTE 3 já consome todos esses registros — conversão, no-shows, sources, funil e motivos passam a ter dados reais povoados pelos fluxos automáticos

### Secrets necessários

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`

Pedirei via `add_secret` após aprovação.

### Fora desta parte

- Zoom OAuth real (fica placeholder; `meeting_url` pode ser preenchido manualmente)
- Outlook / Microsoft Graph
- Import automático de busy-slots do Google Calendar para bloquear disponibilidade (MVP fica: criamos eventos, não lemos)
- Custom domain com SSL automatizado — redirecionamos o usuário ao recurso nativo da plataforma para isso

