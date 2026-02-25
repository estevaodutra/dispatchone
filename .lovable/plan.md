

## Plano: Atualizar lead existente ao invés de bloquear

### Problema

Quando o `/call-dial` recebe uma requisição para um lead que já existe na campanha, ele deveria atualizar as informações do lead (nome, obs) mesmo que o status seja "calling". Atualmente, retorna erro 400 `lead_already_calling` e não atualiza nada.

### Alteração

**Arquivo:** `supabase/functions/call-dial/index.ts`

Na seção "FIND OR CREATE LEAD" (linhas 374-426):

1. Remover o bloqueio por `status === 'calling'` (linhas 376-399) -- ao invés de retornar erro, permitir que o fluxo continue
2. Quando o lead existir, atualizar `name` e quaisquer informações novas antes de prosseguir:

```typescript
if (existingLead) {
  // Update lead info if provided
  const updates: Record<string, any> = {};
  if (lead_name && lead_name !== existingLead.name) {
    updates.name = lead_name;
  }
  if (Object.keys(updates).length > 0) {
    await supabase
      .from('call_leads')
      .update(updates)
      .eq('id', existingLead.id);
  }

  lead = { ...existingLead, ...updates };
  console.log('[call-dial] Found and updated existing lead:', lead.id);
} else {
  // Create new lead (existing code)
}
```

3. O campo `obs` já é salvo no `call_logs.observations` (não no lead), então ele será atualizado/criado normalmente no fluxo subsequente de criação/atualização do call_log.

### Resultado

- Se o lead já existe com status "calling", o sistema atualiza o nome (se fornecido) e cria/atualiza o `call_log` com a nova observação, ao invés de retornar erro.
- Se o lead existe com qualquer outro status, mesmo comportamento.
- O campo `obs` continua sendo gravado em `call_logs.observations` normalmente.

### Arquivos impactados

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/call-dial/index.ts` | Remover bloqueio "calling", adicionar update do lead existente |

