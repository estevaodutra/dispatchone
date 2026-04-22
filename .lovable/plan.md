

## Plano: Roteamento de Notificações de Agenda via Webhook n8n

### Contexto

A PARTE 4 do sistema de Agendamento previa o envio de confirmações e lembretes de WhatsApp através do motor `execute-message` (usado pelas campanhas de grupo/dispatch). A requisição muda o design: **todas as requisições da agenda** passam a sair via webhook único para `https://n8n-n8n.nuwfic.easypanel.host/webhook/agenda`, que o n8n orquestra externamente.

Isso simplifica a PARTE 4 — não precisamos mais integrar `execute-message` nem resolver instâncias WhatsApp dentro do dispatch de agendamento.

### Mudanças no desenho original

**Antes (plano aprovado):**
- `scheduling-dispatch` → resolve instância WhatsApp → chama `execute-message` → renderiza template no backend → Z-API
- `scheduling-reminders` → mesmo fluxo

**Depois (novo desenho):**
- `scheduling-dispatch` → monta payload padronizado → `POST https://n8n-n8n.nuwfic.easypanel.host/webhook/agenda`
- `scheduling-reminders` → idem, com `event` diferenciando `reminder_1d`/`reminder_1h`/`reminder_15m`
- Webhooks de ciclo de vida (criado/cancelado/reagendado/concluído) do calendário e global **continuam** indo para as URLs configuradas pelo usuário em `scheduling_integrations.webhook_*_url` / `scheduling_settings.webhook_global_url` — são dispares adicionais, não substituem o webhook central da agenda

### Payload único enviado ao n8n

Endpoint fixo: `POST https://n8n-n8n.nuwfic.easypanel.host/webhook/agenda`

```json
{
  "event": "appointment.confirmation" | "appointment.reminder_1d" | "appointment.reminder_1h" | "appointment.reminder_15m" | "appointment.cancelled" | "appointment.rescheduled" | "appointment.completed" | "appointment.no_show",
  "timestamp": "2026-04-22T17:30:00Z",
  "company": { "id": "..." },
  "calendar": {
    "id": "...", "name": "...", "slug": "...", "color": "...",
    "modality": "call|video|in_person",
    "duration_minutes": 30,
    "notifications": { /* scheduling_notifications do calendário: templates + toggles */ }
  },
  "attendant": { "id": "...", "name": "...", "email": "...", "phone": "..." },
  "lead": {
    "name": "...", "phone": "...", "email": "...",
    "custom_fields": { ... },
    "answers": { ... }
  },
  "appointment": {
    "id": "...",
    "status": "confirmed",
    "scheduled_start": "...",
    "scheduled_end": "...",
    "timezone": "...",
    "meeting_url": "...",
    "location_snapshot": { ... },
    "cancel_token": "...",
    "manage_link": "https://dispatchone.lovable.app/agendamento/{token}/gerenciar",
    "cancel_link": "https://dispatchone.lovable.app/agendamento/{token}/cancelar",
    "reschedule_link": "https://dispatchone.lovable.app/agendamento/{token}/reagendar"
  },
  "instance_hint": {
    "id": "... (default_whatsapp_instance_id de scheduling_settings, se houver)"
  },
  "utm": { "source": "...", "medium": "...", "campaign": "..." }
}
```

O n8n fica responsável por: escolher a instância Z-API, renderizar templates com variáveis, aplicar lógica de fuso/idioma e disparar a mensagem. O backend apenas envia os dados brutos + templates configurados.

### Edge functions (desta parte 4 revisada)

```
supabase/functions/
├── scheduling-dispatch/       (trigger-driven: envia payload p/ webhook n8n + webhooks de ciclo de vida)
├── scheduling-reminders/      (cron a cada 5min: encontra janelas 1d/1h/15m e envia ao webhook n8n)
├── scheduling-webhook-fire/   (dispara webhooks do calendário/global configurados pelo usuário)
└── scheduling-google-oauth/   (OAuth Google Calendar/Meet — inalterado)
```

Constante compartilhada `AGENDA_WEBHOOK_URL = "https://n8n-n8n.nuwfic.easypanel.host/webhook/agenda"` nas duas primeiras. POST com `Content-Type: application/json`, timeout 10s, 1 retry em erro de rede.

### Banco de dados

Sem alterações além das já previstas na PARTE 4:
- `scheduling_appointments` ganha `confirmation_sent_at`, `reminder_1d_sent_at`, `reminder_1h_sent_at`, `reminder_15m_sent_at`, `google_event_id`, `call_lead_id`
- `scheduling_global_integrations` ganha tokens OAuth do Google
- Trigger `on_scheduling_appointment_changed` (AFTER INSERT/UPDATE OF status) → invoca `scheduling-dispatch` via `pg_net`
- Cron pg_cron/pg_net a cada 5min → `scheduling-reminders`

Fluxo dentro de `scheduling-dispatch`:
1. Carrega appointment + calendar + attendant + lead + settings
2. Se novo `confirmed` e `confirmation_sent_at IS NULL` → POST para `AGENDA_WEBHOOK_URL` com `event=appointment.confirmation` → marca `confirmation_sent_at = now()` + registra evento `confirmation_sent`
3. Se `call_campaign_enabled` e é primeiro `confirmed` → cria lead + `call_queue` (inalterado)
4. Se `video` + `video_auto_link` + Google conectado → cria evento no Google Calendar → salva `meeting_url`/`google_event_id` **antes** do step 2 (para que o payload já saia com `meeting_url`)
5. Mudança para `cancelled`/`rescheduled`/`completed`/`no_show` → POST para `AGENDA_WEBHOOK_URL` com event correspondente + chama `scheduling-webhook-fire` para o webhook do usuário + sync Google Calendar

Fluxo dentro de `scheduling-reminders`:
- Para cada janela, busca appointments `confirmed` com `reminder_*_sent_at IS NULL` e toggle correspondente `enabled` no calendário → POST `AGENDA_WEBHOOK_URL` com `event=appointment.reminder_1d|1h|15m` → marca timestamp → registra evento

### Frontend

- `NotificationsTab` (já existe): troca da dica — "As mensagens são disparadas via webhook central da agenda. Configure templates nos campos abaixo; a entrega é feita pelo n8n."
- `SchedulingSettingsPage` → `NotificationDefaultsCard`: select de instância WhatsApp padrão vira **opcional/hint** (é enviado como `instance_hint` no payload, mas quem decide é o n8n). Copy atualizada.

Demais telas (Analytics, Google OAuth, webhooks de ciclo de vida por calendário) permanecem como no plano original da PARTE 4.

### Secrets

Continuam os mesmos que já foram pedidos:
- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`

Nenhuma credencial nova é necessária para o webhook n8n (URL pública fixa).

### Fora desta parte

- O n8n precisa ter um workflow ativo em `/webhook/agenda` que interprete o `event` e dispare Z-API. Isso é configurado fora do Lovable, pelo usuário.
- Outlook/Microsoft e Zoom OAuth continuam fora.

