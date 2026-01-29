

## Limpeza Automática de Eventos de Webhook a cada 12 horas

### Situação Atual

- **27.158 eventos** acumulados na tabela `webhook_events`
- Eventos mais antigos desde 26/01/2026
- Nenhuma limpeza automática implementada
- A mensagem na UI diz "retidos por 24 horas" mas não há execução real

### Solução Proposta

Criar uma rotina de limpeza automática que será executada pelo `pg_cron` a cada 12 horas.

---

### Alterações

**1. Criar Migration SQL para o pg_cron job**

```sql
-- Habilitar extensão pg_cron se não estiver habilitada
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Criar função de limpeza
CREATE OR REPLACE FUNCTION public.cleanup_webhook_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Deletar eventos com mais de 12 horas
  DELETE FROM public.webhook_events
  WHERE received_at < NOW() - INTERVAL '12 hours';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE LOG 'Webhook events cleanup: deleted % records', deleted_count;
END;
$$;

-- Agendar execução a cada 12 horas (00:00 e 12:00 UTC)
SELECT cron.schedule(
  'cleanup-webhook-events',
  '0 0,12 * * *',
  $$SELECT public.cleanup_webhook_events()$$
);
```

**2. Atualizar mensagem na UI**

**Arquivo:** `src/pages/WebhookEvents.tsx` (linha 276)

```tsx
// De:
"Os eventos são retidos por 24 horas"

// Para:
"Os eventos são retidos por 12 horas e limpos automaticamente"
```

---

### Detalhes Técnicos

| Item | Valor |
|------|-------|
| Tabela | `webhook_events` |
| Retenção | 12 horas |
| Frequência de limpeza | A cada 12h (00:00 e 12:00 UTC) |
| Método | `pg_cron` com função SQL |

### Fluxo

```text
┌─────────────────┐     ┌──────────────────────┐
│  pg_cron        │────▶│ cleanup_webhook_events│
│  0 0,12 * * *   │     │       function        │
└─────────────────┘     └───────────┬───────────┘
                                    │
                                    ▼
                        ┌───────────────────────┐
                        │ DELETE FROM           │
                        │ webhook_events        │
                        │ WHERE received_at     │
                        │ < NOW() - 12 hours    │
                        └───────────────────────┘
```

### Resultado

- ~27k eventos serão limpos na primeira execução
- Tabela manterá apenas eventos das últimas 12 horas
- Redução significativa de carga no banco
- Estatísticas continuarão funcionando para dados recentes

