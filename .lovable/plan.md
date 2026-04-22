

## Plano: Sistema de Agendamento — PARTE 2/4

Escopo: jornada pública completa do lead (8 páginas), gerenciamento de Atendentes (CRUD + disponibilidade), e a aba Lista de Agendamentos (admin).

### Modelo de dados (nova migration)

Tabelas novas:

- **`scheduling_appointments`** — agendamento
  - `id`, `company_id`, `calendar_id`, `attendant_id`, `lead_id` (FK leads, nullable)
  - `status` (`confirmed` | `cancelled` | `completed` | `no_show` | `rescheduled`)
  - `scheduled_start` (timestamptz), `scheduled_end` (timestamptz), `timezone` (text)
  - `lead_name`, `lead_phone`, `lead_email`, `custom_fields` (jsonb)
  - `answers` (jsonb — respostas de qualificação)
  - `meeting_url` (text, para videochamadas), `location_snapshot` (jsonb, presencial)
  - `cancel_token` (text, único) — link público de gerenciamento
  - `cancel_reason` (text), `cancel_comment` (text), `cancelled_at`
  - `rescheduled_from_id` (FK scheduling_appointments, nullable)
  - `utm_source`, `utm_medium`, `utm_campaign`
  - `internal_notes` (text)
  - `created_at`, `updated_at`
  - Índices: `(calendar_id, scheduled_start)`, `(attendant_id, scheduled_start)`, `(cancel_token)`, `(company_id, scheduled_start)`

- **`scheduling_appointment_events`** — timeline de histórico
  - `id`, `appointment_id`, `event_type` (`created`|`confirmation_sent`|`reminder_sent`|`status_changed`|`rescheduled`|`cancelled`|`note_added`), `payload` (jsonb), `created_at`

- **`scheduling_attendant_integrations`** — tokens por atendente (placeholder p/ PARTE 4)
  - `id`, `attendant_id`, `provider` (`google_calendar`|`zoom`|`google_meet`), `is_connected`, `config` (jsonb), `connected_at`

**Acesso público sem auth:**
- Função RPC `public.get_public_calendar(slug text)` (SECURITY DEFINER) — retorna calendário + atendentes + perguntas + campos, sem exigir sessão
- Função RPC `public.get_calendar_availability(calendar_id uuid, attendant_id uuid, from_date date, to_date date)` — retorna slots disponíveis considerando `scheduling_availability`, `scheduling_blocked_dates`, `scheduling_appointments` existentes, buffer e duração
- Função RPC `public.create_public_appointment(payload jsonb)` — insere `scheduling_appointments` com validação de conflito e gera `cancel_token`
- Função RPC `public.get_appointment_by_token(token text)` — leitura pela página de gerenciar
- Função RPC `public.cancel_appointment_by_token(token text, reason text, comment text)`
- Função RPC `public.reschedule_appointment_by_token(token text, new_start timestamptz)`

RLS nas tabelas novas segue padrão existente (`is_company_member`); páginas públicas usam apenas as RPCs.

### Rotas e arquivos novos

```
src/
├── pages/public/
│   ├── BookingLayout.tsx           (wrapper com branding do calendário)
│   ├── BookingSelectAttendant.tsx  (Página 1)
│   ├── BookingSelectSlot.tsx       (Páginas 2 e 8 — reutilizado para reagendar)
│   ├── BookingQualification.tsx    (Página 3)
│   ├── BookingDetails.tsx          (Página 4)
│   ├── BookingSuccess.tsx          (Página 5)
│   ├── BookingManage.tsx           (Página 6)
│   └── BookingCancel.tsx           (Página 7)
├── pages/scheduling/
│   ├── AttendantsPage.tsx          (lista atendentes)
│   └── AppointmentsPage.tsx        (lista agendamentos)
├── components/scheduling/
│   ├── AttendantCard.tsx
│   ├── AttendantFormDialog.tsx     (modal com seções: Info, Calendários, Disponibilidade, Integrações)
│   ├── AttendantAvailabilityEditor.tsx (reaproveita padrão do ScheduleTab)
│   ├── AppointmentRow.tsx
│   ├── AppointmentDetailsDialog.tsx (detalhes + timeline + ações)
│   └── booking/
│       ├── MiniMonthCalendar.tsx   (grid mensal de dias)
│       ├── TimeSlotGrid.tsx        (grade de horários disponíveis)
│       └── BookingSummaryCard.tsx  (resumo reutilizado em várias páginas)
├── hooks/
│   ├── usePublicBooking.ts         (flow público: calendar + slots + create)
│   ├── useAppointments.ts          (admin: lista + filtros + status updates + notes)
│   ├── useAttendantForm.ts         (CRUD + relations)
│   └── useAttendantAvailability.ts (horários por atendente)
└── lib/
    └── booking-slots.ts            (helpers cliente p/ formatação; cálculo principal é server-side na RPC)
```

Atualizar:
- `src/App.tsx` — rotas públicas **fora do `ProtectedRoute`**: `/agendar/:slug`, `/agendar/:slug/:attendantId`, `/agendar/:slug/qualificacao`, `/agendar/:slug/dados`, `/agendar/:slug/sucesso`, `/agendamento/:token/gerenciar`, `/agendamento/:token/cancelar`, `/agendamento/:token/reagendar`. Rotas admin novas sob `/agendamentos`: `atendentes`, `lista`
- `src/pages/scheduling/SchedulingLayout.tsx` — habilitar abas "Agendamentos" e "Atendentes"
- `src/hooks/useAttendants.ts` — acrescentar `update`, `remove`, `uploadPhoto`

### Decisões técnicas

- **Jornada pública sem autenticação**: páginas públicas chamam somente as RPCs `SECURITY DEFINER` (sem RLS no caminho). Estado intermediário da jornada (atendente escolhido, slot, respostas, dados do lead) é mantido em `sessionStorage` com chave `booking:{slug}`.
- **Cálculo de slots**: feito na RPC `get_calendar_availability` a partir de `scheduling_availability` (por atendente), `scheduling_blocked_dates`, `advanced.buffer_minutes`/`advanced.min_notice_hours`/`advanced.booking_window_days`/`advanced.daily_limit` em `scheduling_calendars`, e agendamentos existentes. Retorna array `[{date, slots: ["09:00", ...]}]`.
- **Round-robin vs lead_choice**: quando `distribution = round_robin`, a Página 1 é pulada e a RPC `get_calendar_availability` recebe `attendant_id = null` e escolhe o atendente com menos agendamentos futuros naquele slot (empate por `id`). Quando `lead_choice`, Página 1 é obrigatória.
- **Conflito de horário**: `create_public_appointment` faz `SELECT ... FOR UPDATE` no intervalo e rejeita se já existir appointment ativo sobrepondo o slot do atendente.
- **`cancel_token`**: gerado via `encode(gen_random_bytes(24), 'base64')` URL-safe; único.
- **Reagendamento**: cria novo appointment com `rescheduled_from_id`, marca original como `rescheduled`. Não cria um token novo — reusa o mesmo `cancel_token` (atualiza no novo registro).
- **Branding público**: `BookingLayout` lê `branding`/`texts`/`layout` do calendário e aplica via CSS custom properties no wrapper. Sem tema global — escopo local.
- **Lista de agendamentos (admin)**: agrupa client-side por data (`HOJE`, `AMANHÃ`, dia/mês). Filtros: busca (nome/telefone), calendário, status, atendente. Paginação `range()` de 50 em 50.
- **Detalhes do agendamento**: `AppointmentDetailsDialog` mostra 5 seções (Agendamento, Lead, Qualificação, Histórico, Notas). Histórico lê `scheduling_appointment_events`. Ações: Reagendar (abre slot picker admin), Cancelar (confirma + motivo), Marcar concluído, Marcar no-show, Ligar agora (se `modality=call` e `lead_id`, adiciona à `call_queue`), Abrir reunião (se `meeting_url`). Cada ação registra evento na timeline.
- **Integrações (atendente)**: os cards Google Calendar/Meet/Zoom ficam como placeholders "Conectar em breve" — fluxo OAuth virá na PARTE 4. A tabela `scheduling_attendant_integrations` já fica criada.
- **Meeting URL**: na PARTE 2 o campo fica vazio para videochamadas (geração automática virá na PARTE 4). Se admin preencher manualmente via detalhes, aparece na confirmação.
- **Reaproveitamento**: `MiniMonthCalendar` usa `react-day-picker` (já instalado via `src/components/ui/calendar.tsx`). Sem novas dependências.
- **i18n**: PT/EN/ES com chaves `booking.*` (jornada pública), `scheduling.attendants.*`, `scheduling.appointments.*`.

### Comportamento final

- Lead acessa `dispatchone.lovable.app/agendar/{slug}` → vê branding do calendário
- Se `distribution=lead_choice` com >1 atendente → escolhe atendente → seleciona data/hora → responde qualificação (se houver) → preenche dados → confirma
- Página de sucesso mostra resumo + `cancel_token` no link "Gerenciar Agendamento"
- Lead clica em "Gerenciar" → reagenda (cria novo, marca antigo como `rescheduled`) ou cancela (pede motivo)
- Admin em `/agendamentos/atendentes` cria/edita atendentes com foto, bio, calendários vinculados e disponibilidade customizada
- Admin em `/agendamentos/lista` vê agendamentos agrupados por data, filtra, abre detalhes, executa ações (ligar/reagendar/cancelar/concluir/no-show), adiciona notas
- Histórico (`scheduling_appointment_events`) é alimentado automaticamente a cada mudança de status
- Confirmações por WhatsApp, lembretes, geração de links de reunião e webhooks ficam para **PARTE 4**

### Fora desta parte

- Envio real de WhatsApp de confirmação/lembretes (PARTE 4)
- Integração OAuth com Google Calendar/Meet/Zoom (PARTE 4)
- Webhooks de ciclo de vida do agendamento (PARTE 4)
- Criação automática de lead na campanha de ligação ao confirmar (PARTE 4 — a ação "Ligar agora" manual no admin já funciona)
- Analytics (PARTE 3)

