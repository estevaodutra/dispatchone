
## Diagnóstico: Sequências Agendadas Não Executando

### Problema Identificado

A sequência "Funil FN" parou de executar desde 27/01 porque há **execuções órfãs** travadas com status `running` que bloqueiam novos agendamentos.

#### Evidências:
1. **10+ execuções "running"** de 27/01 que deveriam ter sido limpas como "orphaned"
2. **Nenhuma execução registrada** para 28/01 e 29/01
3. O scheduler está rodando corretamente a cada minuto
4. A lógica de cleanup existe mas **não está funcionando**

#### Fluxo do Problema:

```text
Scheduler roda → Verifica execuções ativas → Encontra status "running" antigo
                                                         ↓
                                              Pula novo agendamento
                                              (Linha 421-428 do código)
```

### Causa Raiz

A query de UPDATE para limpar orphans não está retornando dados ou falhando silenciosamente. O cliente Supabase na Edge Function pode precisar de configuração explícita para bypassar RLS ou a query pode não estar logando erros.

---

### Solução

**1. Corrigir a lógica de cleanup na Edge Function**

**Arquivo:** `supabase/functions/process-scheduled-messages/index.ts`

Adicionar configuração explícita de auth e melhorar log de erros:

```typescript
// Linha 235 - Adicionar opções do client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
```

E melhorar o cleanup com log de erros (linhas 267-282):

```typescript
// ============= CLEANUP ORPHAN EXECUTIONS =============
const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
const { data: orphanExecutions, error: orphanError } = await supabase
  .from("sequence_executions")
  .update({ 
    status: "orphaned",
    error_message: "Cleaned up - stuck as running for >30 minutes",
    updated_at: new Date().toISOString()
  })
  .eq("status", "running")
  .lt("updated_at", thirtyMinutesAgo)
  .select("id");

if (orphanError) {
  console.error(`[Scheduler] Error cleaning orphan executions:`, orphanError);
} else if (orphanExecutions && orphanExecutions.length > 0) {
  console.log(`[Scheduler] Cleaned up ${orphanExecutions.length} orphan executions`);
} else {
  console.log(`[Scheduler] No orphan executions to cleanup`);
}
```

**2. Criar migration para adicionar política RLS para service role (se necessário)**

Adicionar bypass explícito para a service_role:

```sql
-- Permitir service role fazer UPDATE em todas as execuções
CREATE POLICY "Service role can manage all sequence_executions" 
ON sequence_executions
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);
```

**3. Limpar manualmente as execuções órfãs atuais**

Criar uma função auxiliar ou executar via migration:

```sql
UPDATE sequence_executions 
SET status = 'orphaned', 
    error_message = 'Manual cleanup - blocked scheduler'
WHERE status = 'running' 
  AND updated_at < NOW() - INTERVAL '30 minutes';
```

---

### Resumo das Alterações

| Item | Ação |
|------|------|
| `process-scheduled-messages/index.ts` | Adicionar config do client + log de erros |
| Migration SQL | Adicionar política RLS para service_role |
| Migration SQL | Limpar execuções órfãs existentes |

### Resultado Esperado

- Execuções antigas serão limpas imediatamente
- Novos agendamentos às 10:00 e 16:00 serão executados
- Logs mostrarão status da limpeza de orphans
