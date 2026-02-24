

## Plano: Corrigir fila que não avança automaticamente

### Diagnóstico

Analisando os logs e o comportamento observado:

1. **Nenhum log do `queue-executor` foi encontrado** — os ticks não estão sendo disparados, ou estão retornando cedo demais sem logar.
2. **Fluxo observado**: Chamada falha → cooldown do operador (30s) → cooldown termina → operador mostra "Aguardando..." com toggle disponível ligado → **nada acontece**.
3. **Causa raiz**: O intervalo do tick global é de **15 segundos**, mas quando o `resolve_cooldowns` roda na manutenção (separada), ele resolve o operador mas **não dispara um tick imediato**. Além disso, o tick e a manutenção rodam no mesmo intervalo de 15s, criando um gap onde o cooldown resolve mas o próximo tick pode demorar até 15s.
4. **Agravante**: Quando o tick roda e não encontra operador disponível, muda o status da fila para `waiting_operator`. Na próxima execução, o tick processa, mas se o `resolve_cooldowns` dentro do tick não resolver ainda (o cooldown não expirou naquele instante exato), a fila fica presa em `waiting_operator` por mais um ciclo de 15s.

### Alterações

**Arquivo: `src/hooks/useQueueExecution.ts`**

1. **Reduzir intervalo do tick de 15s para 8s** (linha 155) — menor latência entre cooldown resolver e a próxima discagem.

2. **Após manutenção resolver cooldowns, disparar tick imediato** — dentro de `runMaintenance`, se `resolvedOps` tiver resultados E existirem campanhas ativas, chamar `tickAll()` imediatamente em vez de esperar o próximo ciclo de 8s.

3. **Reduzir intervalo da manutenção de 15s para 10s** (linha 146) — garantir que cooldowns sejam resolvidos mais rapidamente.

```typescript
// runMaintenance atualizado:
const runMaintenance = useCallback(async () => {
  if (maintenanceInFlightRef.current) return;
  maintenanceInFlightRef.current = true;
  try {
    const { data: resolved } = await (supabase as any).rpc('resolve_cooldowns');
    await (supabase as any).rpc('heal_stuck_operators', { p_stuck_threshold_minutes: 10 });
    queryClient.invalidateQueries({ queryKey: ["call_operators"] });
    
    // Se cooldowns foram resolvidos e há campanhas ativas, tickar imediatamente
    if (resolved?.length && activeIdsRef.current.length > 0) {
      console.log(`[maintenance] Resolved ${resolved.length} cooldowns, triggering immediate tick`);
      setTimeout(() => tickAll(), 500);
    }
  } catch (e) {
    console.error("[maintenance] error:", e);
  } finally {
    maintenanceInFlightRef.current = false;
  }
}, [queryClient, tickAll]);
```

4. **Intervalos atualizados**:
```typescript
// Manutenção: 10s em vez de 15s
const interval = setInterval(runMaintenance, 10000);

// Ticks: 8s em vez de 15s
const interval = setInterval(tickAll, 8000);
```

### Resultado esperado

- Após o cooldown expirar, o `resolve_cooldowns` (rodando a cada 10s) detecta e libera o operador
- Imediatamente após a resolução, um tick é disparado (em vez de esperar mais 8-15s)
- O tick encontra o operador disponível e disca o próximo lead
- Tempo máximo de espera após cooldown: ~10s (antes: ~30s ou infinito)

### Impacto
- Apenas `src/hooks/useQueueExecution.ts` é alterado
- Sem alteração no backend (edge functions)
- Maior frequência de polling (10s manutenção + 8s ticks vs 15s+15s)

