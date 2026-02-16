
# Corrigir: Chamadas orfas ficam presas em "Discando" e operador e reatribuido sem encerrar chamada anterior

## Diagnostico

O sistema tem **3 problemas interligados**:

1. **Chamadas orfas**: Quando o self-healing libera o operador de uma chamada finalizada, ele e imediatamente reatribuido a uma nova chamada. Porem, chamadas anteriores que estavam em `dialing` (como a da Marissa) ficam abandonadas nesse status para sempre - ninguem as encerra.

2. **Ticks duplicados**: O hook `useQueueExecution` (por campanha) e o `useQueueExecutionSummary` (global) disparam ticks simultaneamente para a mesma campanha, causando execucoes concorrentes no backend.

3. **Self-healing incompleto**: O self-healing libera o operador mas nao limpa chamadas orfas vinculadas a ele.

## Solucao

### 1. Edge Function `queue-executor` - Limpeza de chamadas orfas

No `processTick`, **antes de atribuir o operador a uma nova chamada**, verificar se ele tem chamadas ativas (`dialing`, `ringing`, `in_progress`) que nao sao a chamada atual. Se tiver, marca-las como `cancelled` com motivo "operator_reassigned".

Tambem no self-healing: alem de liberar o operador, cancelar quaisquer chamadas em `dialing`/`ringing` vinculadas a ele cuja chamada ja finalizou.

```
Logica adicionada ao self-healing (apos liberar operador):

  -- Cancelar chamadas orfas deste operador
  UPDATE call_logs 
  SET call_status = 'cancelled', ended_at = now()
  WHERE operator_id = op.id 
  AND call_status IN ('dialing', 'ringing')
  AND id != op.current_call_id
```

### 2. Edge Function `queue-executor` - Status correto para novos leads

Na secao 3b (novos leads, linha 349), o call_log e criado com `scheduled` em vez de `dialing`. Como o webhook e disparado imediatamente, o status deveria ser `dialing` para refletir a realidade e para que o self-healing funcione corretamente.

### 3. Hook `useQueueExecution` - Remover tick loop duplicado

O hook individual `useQueueExecution` nao deve disparar ticks, pois o `useQueueExecutionSummary` ja faz isso globalmente. Remover o `useEffect` de tick automatico do hook per-campaign, mantendo apenas o tick imediato nos `onSuccess` de start/resume.

## Detalhes Tecnicos

### Arquivo: `supabase/functions/queue-executor/index.ts`

**Mudanca 1 - Self-healing expandido (apos linha 173):**

Apos liberar um operador preso, tambem cancelar chamadas orfas:
```typescript
// Apos liberar operador stuck
// Cancelar chamadas orfas deste operador
await supabase
  .from('call_logs')
  .update({ call_status: 'cancelled', ended_at: new Date().toISOString() })
  .eq('operator_id', op.id)
  .in('call_status', ['dialing', 'ringing']);
```

**Mudanca 2 - Limpeza antes de nova atribuicao (antes da linha 267 e 361):**

Antes de atribuir o operador a uma nova chamada (tanto no path 3a quanto 3b), cancelar quaisquer chamadas ativas anteriores dele:
```typescript
// Cancelar chamadas ativas anteriores deste operador
await supabase
  .from('call_logs')
  .update({ call_status: 'cancelled', ended_at: new Date().toISOString() })
  .eq('operator_id', operator.id)
  .in('call_status', ['dialing', 'ringing', 'in_progress']);
```

**Mudanca 3 - Status correto para novos leads (linha 349):**

Alterar `call_status: 'scheduled'` para `call_status: 'dialing'` no insert do path 3b, ja que o webhook sera disparado imediatamente.

### Arquivo: `src/hooks/useQueueExecution.ts`

**Mudanca 4 - Remover tick loop duplicado do hook per-campaign:**

Remover o `useEffect` que cria setInterval para tick no `useQueueExecution`. Manter apenas:
- A funcao `tick` (para uso manual/onSuccess)
- Os setTimeout nos `onSuccess` de start/resume

O loop global no `useQueueExecutionSummary` ja cobre todas as campanhas ativas.

## Arquivos modificados

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/queue-executor/index.ts` | Self-healing cancela chamadas orfas; limpeza antes de nova atribuicao; status correto para novos leads |
| `src/hooks/useQueueExecution.ts` | Remover tick loop duplicado do hook per-campaign |

## Impacto

- Chamadas orfas serao automaticamente canceladas quando o operador for reatribuido
- O self-healing agora limpa tanto o operador quanto as chamadas presas
- Menos ticks concorrentes = menos race conditions e menos carga no backend
- O status "Discando" so aparecera para chamadas realmente ativas
