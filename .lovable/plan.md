

## Plano: Exportar Membros para Webhook com Agendamento

### Resumo
Adicionar na aba Membros um botão "Exportar Webhook" que abre um dialog para configurar a URL do webhook, filtros de status e agendamento opcional (único ou recorrente). A exportação envia os membros como payload JSON via webhook-proxy.

### Alterações

**Nova tabela `member_export_schedules` (migration)**
```sql
CREATE TABLE public.member_export_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  group_campaign_id uuid NOT NULL,
  webhook_url text NOT NULL,
  status_filter text[] DEFAULT '{active}',
  schedule_type text NOT NULL DEFAULT 'once', -- once, daily, weekly
  schedule_time time DEFAULT '08:00',
  schedule_day_of_week int, -- 0-6 for weekly
  next_run_at timestamptz,
  last_run_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.member_export_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own exports" ON public.member_export_schedules
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

**Nova edge function `export-members-webhook/index.ts`**
- Recebe `group_campaign_id`, `webhook_url`, `status_filter` (opcional)
- Busca membros da tabela `group_members` com filtros aplicados
- Envia POST para `webhook_url` com payload:
  ```json
  {
    "action": "members.export",
    "campaign_id": "...",
    "exported_at": "ISO",
    "total": 706,
    "members": [{ "phone": "...", "name": "...", "status": "active", "is_admin": false, "joined_at": "..." }]
  }
  ```
- Também chamada pelo cron para agendamentos ativos

**Novo componente `ExportWebhookDialog.tsx`** em `src/components/group-campaigns/dialogs/`
- Dialog com campos:
  - URL do webhook (input text, obrigatório)
  - Filtro de status (multi-select: Ativos, Removidos, Todos)
  - Tipo de envio: "Agora" ou "Agendar"
  - Se agendar: frequência (Diário, Semanal), horário, dia da semana (se semanal)
- Botão "Exportar Agora" envia imediatamente via edge function
- Botão "Salvar Agendamento" grava na tabela `member_export_schedules`

**`src/components/group-campaigns/tabs/MembersTab.tsx`**
- Importar e adicionar botão "Exportar Webhook" (ícone Send/Webhook) na barra de ações, ao lado do Exportar CSV
- Controlar estado `showExportWebhookDialog`
- Renderizar `<ExportWebhookDialog>`

**Novo hook `useExportSchedules.ts`**
- CRUD na tabela `member_export_schedules` filtrado por `group_campaign_id`
- Listar agendamentos ativos no dialog para gerenciamento

**Cron job (pg_cron via SQL insert)**
- Rodar a cada hora, chamando a edge function para processar agendamentos com `next_run_at <= now()`
- A edge function atualiza `next_run_at` e `last_run_at` após execução

### Fluxo do Usuário
1. Clica "Exportar Webhook" na aba Membros
2. Informa a URL do webhook destino
3. Escolhe filtro de status (padrão: Ativos)
4. Escolhe "Enviar agora" ou agenda para horário/frequência
5. Se agora: membros são enviados imediatamente, toast de sucesso
6. Se agendado: registro salvo, exportação automática no horário configurado

