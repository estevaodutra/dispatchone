

## Corrigir: Ligações agendadas não são processadas quando a fila tem itens

### Diagnóstico

O fluxo atual do `processGlobalTick` é:
1. Chama `queue_get_next_v2` (busca na `call_queue`)
2. Se encontrou item → disca e retorna
3. **Somente se a fila estiver vazia** → fallback para `call_logs` (scheduled/ready)

O problema: existem ligações agendadas na `call_logs` (campanha prioritária "FN | Abandono de Funil") com `scheduled_for` já vencido, mas como a `call_queue` tem 28 itens de outra campanha, o fallback nunca é atingido. Os agendamentos ficam "presos" indefinidamente.

### Solução

**Arquivo: `supabase/functions/queue-processor/index.ts` (função `processGlobalTick`, linhas ~198-211)**

Inverter a prioridade: **antes** de chamar `queue_get_next_v2`, verificar se existem `call_logs` com `scheduled_for <= NOW()` e `call_status IN ('scheduled', 'ready')`. Se houver, processá-los primeiro (são reagendamentos que o operador marcou para um horário específico).

A lógica alterada ficará:

```
1. Heal operators + resolve cooldowns (igual)
2. Check available operator (igual)
3. **NOVO**: Buscar call_logs com scheduled_for <= NOW() e status scheduled/ready
   → Se encontrou → reservar operador, discar, retornar
4. Chamar queue_get_next_v2 (fila regular)
   → Se encontrou → discar, retornar
5. Fallback removido (já coberto pelo passo 3)
```

Isso garante que reagendamentos sempre têm prioridade sobre a fila regular, pois representam compromissos específicos marcados pelo operador. Entre múltiplos agendamentos, os de campanhas prioritárias vêm primeiro (`cc.is_priority DESC, cl.scheduled_for ASC`).

### Impacto
- Agendamentos serão respeitados mesmo com fila cheia
- A fila regular continua funcionando normalmente quando não há agendamentos pendentes
- Nenhuma mudança no frontend necessária

