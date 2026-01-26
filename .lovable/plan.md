

## Plano: Implementar Delays Longos com Agendamento em Background

### Problema Identificado

Os delays nao estao sendo respeitados porque ha um limite de 20 segundos (`MAX_DELAY_MS`) imposto para respeitar o timeout das Edge Functions do Supabase (maximo ~60s). Quando voce configura um delay de 15 minutos, o sistema so espera 20 segundos.

**Evidencia nos logs:**
```
[Scheduler] Delay node: waiting 20000ms (requested: 900000ms)
```

---

### Causa Raiz

Edge Functions do Supabase tem um timeout maximo de aproximadamente 60 segundos. Por isso, o codigo atual limita os delays a 20 segundos para evitar que a funcao seja terminada no meio da execucao.

```typescript
// Linha 12
const MAX_DELAY_MS = 20000;

// Linha 548
const effectiveDelay = Math.min(delayMs, MAX_DELAY_MS);
```

---

### Solucao Proposta: Agendamento de Continuacao

Quando encontrar um delay maior que 20 segundos, ao inves de esperar, o sistema deve:

1. **Salvar o estado da execucao** em uma tabela `sequence_executions`
2. **Agendar a continuacao** para o momento futuro (now + delay)
3. **Usar pg_cron ou chamada agendada** para retomar a execucao

---

### Novo Modelo de Dados

Criar tabela `sequence_executions` para rastrear execucoes em andamento:

```sql
CREATE TABLE sequence_executions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  campaign_id UUID NOT NULL,
  sequence_id UUID NOT NULL,
  trigger_context JSONB,
  current_node_index INTEGER DEFAULT 0,
  destinations JSONB NOT NULL,
  status TEXT DEFAULT 'running',
  resume_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

---

### Fluxo Modificado

```
[Iniciar sequencia]
        |
        v
[Processar nodes ate encontrar delay > 20s]
        |
        v
[Se delay > MAX_DELAY_MS]
        |
        v
[Salvar estado em sequence_executions]
[resume_at = now() + delay_ms]
        |
        v
[Retornar resposta - execucao parcial]
        |
        v
[pg_cron a cada minuto verifica sequence_executions]
        |
        v
[Se resume_at <= now(), continuar de current_node_index]
```

---

### Mudancas nos Arquivos

| Arquivo | Acao |
|---------|------|
| `supabase/functions/execute-message/index.ts` | Detectar delays longos, salvar estado, agendar continuacao |
| `supabase/functions/process-scheduled-messages/index.ts` | Adicionar verificacao de `sequence_executions` pendentes |
| Nova migration SQL | Criar tabela `sequence_executions` |

---

### Alternativa Mais Simples (Trade-off)

Se a complexidade da solucao acima for excessiva, uma alternativa seria:

**Usar o n8n para orquestrar delays longos:**
- A Edge Function envia um payload com `delay_ms` para o n8n
- O n8n usa seu proprio mecanismo de "Wait" (que suporta delays de horas/dias)
- Apos o wait, o n8n chama de volta a Edge Function para continuar

---

### Diagrama do Fluxo Proposto

```
+----------------------+
|  Iniciar Sequencia   |
+----------------------+
          |
          v
+----------------------+
|  Processar Node 1    |
+----------------------+
          |
          v
+----------------------+
|  Node 2 = Delay 15m  |
+----------------------+
          |
          v
+------------------------+
| Delay > 20s?           |
| SIM -> Salvar estado   |
|        resume_at=+15m  |
|        return "pending"|
+------------------------+
          |
          v
+------------------------+
| pg_cron (cada minuto)  |
| Verificar resume_at    |
+------------------------+
          |
          v
+------------------------+
| resume_at <= now()     |
| Carregar estado        |
| Continuar do Node 3    |
+------------------------+
```

---

### Recomendacao

Sugiro implementar a **Alternativa Mais Simples primeiro** (delegar delays longos ao n8n), pois:

1. Requer menos mudancas no banco de dados
2. O n8n ja tem suporte nativo a delays longos
3. Mantem a arquitetura de webhook existente
4. Pode ser implementado mais rapidamente

Posso detalhar qual abordagem voce prefere?

