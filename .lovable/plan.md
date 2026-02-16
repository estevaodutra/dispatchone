
# Corrigir: Execucao dupla do mesmo operador em campanhas diferentes

## Problema

O `tickAll` no hook `useQueueExecutionSummary` dispara ticks para todas as campanhas ativas **em paralelo** usando `Promise.all`. Quando duas campanhas estao ativas, ambas chamam `queue-executor?action=tick` ao mesmo tempo. As duas encontram o mesmo operador como "available" e atribuem ele simultaneamente -- resultado: o mesmo operador fica "Discando" para dois leads diferentes.

## Solucao

Alterar o `tickAll` para executar os ticks **sequencialmente** (um por vez) com um delay de 3 segundos entre cada campanha. Isso garante que, apos o tick da primeira campanha atribuir um operador, o tick da segunda campanha ja vera o operador como "on_call" e nao o reutilizara.

## Detalhes Tecnicos

### Arquivo: `src/hooks/useQueueExecution.ts`

Modificar a funcao `tickAll` dentro de `useQueueExecutionSummary`:

**Antes (paralelo):**
```
await Promise.all(
  ids.map((id) => supabase.functions.invoke(...))
);
```

**Depois (sequencial com delay):**
```
for (const id of ids) {
  await supabase.functions.invoke(
    `queue-executor?campaign_id=${id}&action=tick`,
    { method: "POST" }
  );
  // Delay de 3s entre campanhas para evitar atribuicao dupla
  if (id !== ids[ids.length - 1]) {
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
}
```

A mesma correcao sera aplicada na funcao `tickAll` que ja existe no hook. O delay de 3 segundos entre cada campanha garante que o banco de dados tenha tempo de refletir a mudanca de status do operador antes do proximo tick ser processado.

### Arquivo modificado

| Arquivo | Mudanca |
|---|---|
| `src/hooks/useQueueExecution.ts` | Trocar `Promise.all` por loop sequencial com delay de 3s entre campanhas no `tickAll` |
