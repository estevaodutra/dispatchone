

## Plano: Sistema de Agendamento - PARTE 1/4 (Fundação + Calendários)

Este plano cobre a **PARTE 1 de 4** do sistema de Agendamento estilo Calendly. Foca em estrutura base, navegação, modelo de dados, listagem de calendários e modal de criação/edição com 6 abas.

### Escopo desta parte

✅ Menu lateral + rota `/agendamentos/*`
✅ Modelo de dados completo (calendários, atendentes, disponibilidade, perguntas)
✅ Página de listagem de Calendários
✅ Modal Criar/Editar Calendário (6 abas funcionais)
✅ Hook `useCalendars` (CRUD)

⏳ **Fora desta parte** (próximas partes): página pública de agendamento, lista de agendamentos, atendentes/disponibilidade dedicada, analytics, integrações (WhatsApp/Meet/Google Calendar), cancelamento por token

### Modelo de dados (migration)

Tabelas novas, todas com `company_id` + RLS via `is_company_member`:

- **`scheduling_calendars`** — calendário (slug único por company, modalidade, duração, cor, distribuição, status, branding JSONB, textos JSONB, layout JSONB, configs avançadas JSONB)
- **`scheduling_attendants`** — atendente (nome, foto, bio, email, vínculo opcional a `call_operators`/`profiles`, ativo)
- **`scheduling_calendar_attendants`** — N:N calendário ↔ atendente
- **`scheduling_availability`** — disponibilidade semanal por atendente (dia 0-6, hora início/fim, múltiplos intervalos)
- **`scheduling_blocked_dates`** — datas bloqueadas por atendente (feriados/férias)
- **`scheduling_questions`** — perguntas de qualificação por calendário (texto, tipo, opções JSONB, obrigatório, ordem)
- **`scheduling_lead_fields`** — campos do lead por calendário (nome, telefone padrão; extras configuráveis)
- **`scheduling_notifications`** — config de notificações por calendário (mensagens + toggles + lembretes)
- **`scheduling_integrations`** — config de integrações (campanha ligação, videochamada, presencial, webhooks)

Constraints: `slug` único por `company_id`, índices em `company_id`, `calendar_id`, `attendant_id`.

### Arquivos a criar

```
src/
├── pages/scheduling/
│   ├── SchedulingLayout.tsx          (Outlet com sub-nav)
│   └── CalendarsPage.tsx              (lista de calendários)
├── components/scheduling/
│   ├── CalendarCard.tsx               (card de calendário)
│   ├── CalendarFormDialog.tsx         (modal 6 abas — orquestrador)
│   └── calendar-form/
│       ├── BasicTab.tsx               (Aba 1: nome, slug, modalidade, duração, cor, atendentes)
│       ├── ScheduleTab.tsx            (Aba 2: horários semanais + buffer/antecedência/limite/janela)
│       ├── AppearanceTab.tsx          (Aba 3: logo, cores, fundo, textos, layout + preview)
│       ├── QualificationTab.tsx       (Aba 4: perguntas drag&drop nativo)
│       ├── NotificationsTab.tsx       (Aba 5: WhatsApp + lembretes)
│       └── IntegrationsTab.tsx        (Aba 6: campanha, vídeo, presencial, webhooks, campos lead)
├── hooks/
│   ├── useCalendars.ts                (lista/CRUD calendários)
│   ├── useCalendarDetails.ts          (detalhes + relações para o modal)
│   └── useAttendants.ts               (lista atendentes para checkbox)
└── i18n/locales/                       (chaves novas em pt/en/es)
```

Atualizar:
- `src/components/layout/AppSidebar.tsx` — item "📅 Agendamentos" com sub-itens (Calendários, Agendamentos, Atendentes, Analytics, Configurações). Por ora, só Calendários é navegável; demais ficam com badge "Em breve".
- `src/App.tsx` — rotas `/agendamentos`, `/agendamentos/calendarios` (placeholder para outras).

### Decisões técnicas

- **Drag & drop**: HTML5 nativo (`draggable` + `onDragStart/Over/Drop`) — sem nova dependência, padrão já adotado no projeto
- **Slug**: gerado de `name` via `slugify` simples (lowercase, sem acento, hífens), validação de unicidade via consulta antes de salvar
- **Cores**: `<input type="color">` + presets em botões; armazenadas como JSONB `branding`
- **Upload de logo/fundo**: novo bucket público `scheduling-assets` (segue padrão de `sequence-media`)
- **Preview de aparência**: card lateral fake na Aba 3 lendo o estado atual do form
- **Atendentes**: na Aba 1 mostra checkboxes a partir de `scheduling_attendants` da company; "Adicionar Atendente" abre mini-form inline (cria registro `scheduling_attendants` simples — gerenciamento completo virá na PARTE 2)
- **Modalidade condicional**: campos Aba 6 (videochamada/presencial) só aparecem quando modalidade selecionada
- **Variáveis de mensagem**: chips clicáveis na Aba 5 que inserem `{{lead.name}}` etc. no textarea
- **Multi-tenancy**: tudo isolado por `company_id` via `useCompany()`
- **i18n**: chaves novas em `scheduling.*` para pt/en/es

### Comportamento final desta parte

- Usuário vê novo item "Agendamentos" no menu → clica em "Calendários"
- Vê lista vazia com CTA "Criar Calendário"
- Clica → modal 6 abas → preenche → salva → calendário aparece na lista
- Card mostra ícone da modalidade, status, duração, dias da semana, link público (copiável), contador de agendamentos (0 por enquanto)
- Pode editar (mesmo modal carregado), pausar/ativar (toggle status), excluir (com confirmação)
- O **link público copiado ainda não tem página renderizada** — virá na PARTE 2 com a página pública de agendamento

### Próximas partes (fora deste escopo)

- **PARTE 2**: Página pública de agendamento (calendário visual, escolha de horário, formulário, qualificação, confirmação)
- **PARTE 3**: Página de Agendamentos (lista de bookings), Atendentes (CRUD + disponibilidade), token de cancelamento/reagendamento
- **PARTE 4**: Analytics, integrações reais (WhatsApp/Meet/Zoom/Google Calendar), webhooks, lembretes via cron

