

## Limpeza Automática da Fila às 23:59

### Abordagem

Usar **pg_cron + função SQL direta** (sem Edge Function) — mais simples, confiável e não depende de autenticação HTTP.

### 1. Migração SQL

Criar a função `clear_daily_queue()` e agendar via `pg_cron`:

```sql
-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Função de limpeza
CREATE OR REPLACE FUNCTION public.clear_daily_queue()
RETURNS TABLE(companies_processed int, total_expired int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_companies int := 0;
  v_total int := 0;
  v_company_id uuid;
  v_count int;
BEGIN
  FOR v_company_id IN
    SELECT DISTINCT company_id FROM call_queue WHERE status = 'waiting'
  LOOP
    WITH expired AS (
      UPDATE call_queue SET status = 'expired'
      WHERE company_id = v_company_id AND status = 'waiting'
      RETURNING id
    )
    SELECT COUNT(*) INTO v_count FROM expired;

    v_total := v_total + v_count;

    -- Stop all queues and reset priority counters
    UPDATE queue_execution_state
    SET status = 'stopped', priority_counter = 0, updated_at = NOW()
    WHERE company_id = v_company_id;

    v_companies := v_companies + 1;
  END LOOP;

  RETURN QUERY SELECT v_companies, v_total;
END;
$$;
```

O agendamento cron será criado via insert tool (não migração) pois contém dados específicos do projeto:
```sql
SELECT cron.schedule('clear-daily-queue', '59 23 * * *', 'SELECT * FROM clear_daily_queue();');
```

### 2. Nenhuma alteração de constraint

A coluna `status` em `call_queue` é `varchar` sem CHECK constraint — o valor `expired` funciona diretamente.

### 3. UI — Badge "Expirada" no StatusBadge

Arquivo: `src/components/dispatch/StatusBadge.tsx`

Adicionar `expired` como variante no `statusBadgeVariants`, com cor amarela/cinza, dot `bg-amber-400`, e label `Expirada`.

### 4. HistoryTab — Sem alteração necessária agora

A HistoryTab atual mostra dados da `call_logs`, não da `call_queue`. Itens expirados ficam na `call_queue` com status `expired`. Para visualizá-los seria necessário uma consulta separada à `call_queue` — isso pode ser implementado como melhoria futura (re-adicionar expirados, relatório de expirados).

### Resumo de Arquivos

| Arquivo | Ação |
|---------|------|
| Migração SQL | Criar `clear_daily_queue()` |
| Insert SQL | `cron.schedule(...)` |
| `src/components/dispatch/StatusBadge.tsx` | Adicionar variante `expired` |

