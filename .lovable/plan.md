

## Correção: Execução Sequencial Garantida

### Problemas Identificados

Analisei os logs e encontrei 3 problemas críticos no processamento de sequências:

---

### Problema 1: Re-execução da Sequência em Novos Horários Agendados

**O que acontece:**
- Uma sequência começa às 13:00 e pausa no primeiro delay (1 minuto)
- A mensagem está agendada para 10:00 E 10:17
- Quando o cron dispara às 10:17, ele **inicia uma nova execução do zero** em vez de continuar a pausada
- Resultado: nodes 0, 2 são enviados duas vezes; nodes 6, 8, 10 nunca são enviados

**Evidência:**
| Horário | Node | Grupo | Problema |
|---------|------|-------|----------|
| 13:00 | 0 (video) | G1, G2 | ✅ Correto - início |
| 13:02 | 2 (buttons) | G1, G2 | ✅ Correto - continuação |
| 13:17 | 0 (video) | G1, G2 | ❌ REINICIOU do zero! |
| 13:19 | 2 (buttons) | G1, G2 | ❌ Duplicado |

---

### Problema 2: Execuções Órfãs com Status "running"

**O que acontece:**
- Quando uma execução pausada é resumida, ela cria uma NOVA entrada no banco
- A execução anterior fica com status "running" para sempre
- Atualmente existem 10+ execuções órfãs

---

### Problema 3: Falta de Verificação de Execução em Andamento

O `process-scheduled-messages` não verifica se já existe uma execução ativa antes de iniciar uma nova.

---

### Solução Proposta

**Arquivo:** `supabase/functions/process-scheduled-messages/index.ts`

#### Alteração 1: Verificar execução em andamento antes de criar nova

```typescript
// Antes de iniciar nova execução, verificar se já existe uma em andamento
const { data: activeExecution } = await supabase
  .from("sequence_executions")
  .select("id, current_node_index, status")
  .eq("sequence_id", message.sequence_id)
  .in("status", ["paused", "running"])
  .order("created_at", { ascending: false })
  .limit(1)
  .maybeSingle();

if (activeExecution) {
  console.log(`[Scheduler] Sequence ${message.sequence_id} already has active execution ${activeExecution.id} at node ${activeExecution.current_node_index}, skipping new trigger`);
  results.push({ 
    messageId: message.id, 
    status: "skipped", 
    error: "Execution already in progress" 
  });
  continue;
}
```

#### Alteração 2: Limpar execuções órfãs ao completar

**Arquivo:** `supabase/functions/execute-message/index.ts`

```typescript
// Quando uma execução resume e completa, marcar execuções antigas como "superseded"
if (isResumedExecution && executionId) {
  // Mark old "running" executions for same sequence as superseded
  await supabase
    .from("sequence_executions")
    .update({
      status: "superseded",
      updated_at: new Date().toISOString(),
    })
    .eq("sequence_id", effectiveSequenceId)
    .eq("status", "running")
    .neq("id", executionId);
}
```

#### Alteração 3: Adicionar limpeza periódica de execuções órfãs

No início do `process-scheduled-messages`, antes de processar paused executions:

```typescript
// Clean up orphan executions stuck as "running" for more than 30 minutes
const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
const { data: orphanExecutions } = await supabase
  .from("sequence_executions")
  .update({ 
    status: "orphaned",
    error_message: "Cleaned up - stuck as running for >30 minutes",
    updated_at: new Date().toISOString()
  })
  .eq("status", "running")
  .lt("updated_at", thirtyMinutesAgo)
  .select("id");

if (orphanExecutions && orphanExecutions.length > 0) {
  console.log(`[Scheduler] Cleaned up ${orphanExecutions.length} orphan executions`);
}
```

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/process-scheduled-messages/index.ts` | Verificar execução ativa antes de criar nova + limpeza de órfãos |
| `supabase/functions/execute-message/index.ts` | Marcar execuções antigas como "superseded" ao completar |

---

### Resultado Esperado

1. Cada sequência só terá UMA execução ativa por vez
2. Novos triggers de horário agendado serão ignorados se a sequência já está em execução
3. Todos os nodes (0-10) serão enviados em ordem
4. Sem duplicações de mensagens
5. Execuções órfãs serão limpas automaticamente

