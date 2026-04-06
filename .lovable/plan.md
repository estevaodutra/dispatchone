

## Plano: Agendar atualização automática de status a cada 3 horas

### O que será feito
Criar uma Edge Function dedicada (`refresh-instance-status`) que replica a lógica do botão "Atualizar Status" — busca todas as instâncias com credenciais, chama o webhook n8n, e atualiza o banco. Depois, agendar essa função via `pg_cron` para rodar a cada 3 horas.

### Alterações

#### 1. Nova Edge Function `supabase/functions/refresh-instance-status/index.ts`

- Busca todas as instâncias com `external_instance_id` e `external_instance_token` preenchidos
- Envia POST para `https://n8n-n8n.nuwfic.easypanel.host/webhook/status_instances` com os dados
- Processa a resposta (match por `id` externo, mapeia `connected` → status, salva `paymentStatus` e `due`)
- Atualiza o banco diretamente (usa service role key, sem precisar de auth do usuário)
- Também aciona a lógica de auto-registro/desconexão de `phone_numbers` (igual ao `instance-status`)

#### 2. Cron job via `pg_cron` + `pg_net`

Habilitar as extensões e criar o agendamento:

```sql
SELECT cron.schedule(
  'refresh-instance-status-every-3h',
  '0 */3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://btvzspqcnzcslkdtddwl.supabase.co/functions/v1/refresh-instance-status',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <anon_key>"}'::jsonb,
    body := '{"source":"cron"}'::jsonb
  ) AS request_id;
  $$
);
```

### Arquivos
- **Novo:** `supabase/functions/refresh-instance-status/index.ts`
- **SQL insert** (cron job, não migration)

