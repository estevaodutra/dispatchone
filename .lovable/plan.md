
# Corrigir: Acao em ligacao ja concluida nao dispara automacao

## Problema

Na linha 572 do `useCallPanel.ts`, quando o `call_status` ja e `"completed"`, o codigo retorna imediatamente com `{ automationSuccess: true, skipped: true }`, pulando TODA a automacao. O toast mostra sucesso mas nenhuma mensagem e enviada.

Isso ocorre quando o usuario clica numa acao em uma ligacao que ja foi concluida anteriormente (caso do lead Estevao/12982402981 que ja tinha sido concluido as 16:22 UTC).

## Solucao

Separar a logica de "atualizar o call_log" da logica de "executar automacao":

1. Se o call_status ja for "completed", pular apenas a atualizacao do banco (evitar duplicar update), mas AINDA executar a automacao
2. Tratar o caso `skipped` no toast para mostrar que a acao ja estava registrada mas a automacao foi executada

### Mudanca no arquivo `src/hooks/useCallPanel.ts`

**Antes (linha 572-574):**
```typescript
if (freshLog?.call_status === "completed") {
  return { automationSuccess: true, skipped: true };
}
```

**Depois:**
```typescript
const alreadyCompleted = freshLog?.call_status === "completed";

if (!alreadyCompleted) {
  // Atualizar call_log apenas se ainda nao estava completed
  const { error } = await (supabase as any)
    .from("call_logs")
    .update({ action_id: actionId, notes: notes || null, call_status: "completed", ended_at: new Date().toISOString() })
    .eq("id", callId);
  if (error) throw error;

  // Reset operator, update lead... (codigo existente)
}
// A automacao continua executando independente do status anterior
```

Isso garante que:
- O call_log nao e atualizado duas vezes (evita duplicatas)
- O operador nao e resetado duas vezes
- O lead nao e atualizado duas vezes
- MAS a automacao (disparo de sequencia) SEMPRE executa quando o usuario clica no botao

### Mudanca no toast (onSuccess)

Adicionar tratamento para `skipped`:
```typescript
if (result && !result.automationSuccess) {
  toast({ title: "Acao registrada", description: `Automacao falhou: ${result.automationError}`, variant: "destructive" });
} else if (result?.skipped) {
  toast({ title: "Automacao executada", description: "Ligacao ja estava concluida. Mensagem enviada." });
} else {
  toast({ title: "Acao registrada", description: "Resultado da ligacao registrado com sucesso." });
}
```
