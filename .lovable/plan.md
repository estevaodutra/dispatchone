

## Diagnóstico: Fila automática não dispara ticks

### O que foi verificado

1. **Backend funciona**: Executei manualmente um tick via edge function — discou "Thaina" com operador "Mauro Dutra" com sucesso.
2. **Dados corretos**: Campanha `f78dc789...` está em `waiting_operator`, operador "Mauro Dutra" está `available`, há 10+ `call_logs` em `ready`.
3. **Zero logs do `queue-executor`**: Nenhum tick foi disparado pelo frontend — o loop do `useQueueExecutionSummary` não está chamando a edge function.

### Causa raiz provável

O `useEffect` que controla o tick loop depende de `[activeIds.length, tickAll]`. A referência de `tickAll` é recriada pelo `useCallback` sempre que `queryClient` muda (raro, mas possível). No entanto, o problema mais provável é que:

1. A primeira chamada do `tickAll` pode falhar silenciosamente (ex: erro de rede, timeout), seta `tickInFlightRef.current = true` mas **não chega ao `finally`** se o `supabase.functions.invoke` retornar uma promise que nunca resolve.
2. Alternativamente, como o `useEffect` depende de `activeIds.length` (valor numérico), e o `refetchInterval` de 5s atualiza `states`, o array `activeIds` é recriado a cada render, mas `.length` permanece o mesmo, então o efeito NÃO re-executa — o que é correto. Porém, se a primeira execução falhou e `tickInFlightRef` ficou `true`, todas as execuções subsequentes são bloqueadas pelo guard `if (tickInFlightRef.current) return;`.

### Plano de correção

**Arquivo: `src/hooks/useQueueExecution.ts`**

1. **Adicionar timeout safety no `tickAll`**: Envolver o `supabase.functions.invoke` com um `Promise.race` com timeout de 30s para evitar que promises penduradas bloqueiem o ref.

2. **Adicionar logs de debug**: Colocar `console.log` no início e fim do `tickAll` e `runMaintenance` para facilitar diagnóstico futuro.

3. **Reset do `tickInFlightRef` no efeito**: Sempre resetar o ref quando o efeito re-executa (cleanup).

```typescript
const tickAll = useCallback(async () => {
  if (tickInFlightRef.current) {
    console.log("[global-queue-tick] skipped (in-flight)");
    return;
  }
  const ids = activeIdsRef.current;
  if (ids.length === 0) return;
  
  console.log(`[global-queue-tick] processing ${ids.length} campaigns`);
  tickInFlightRef.current = true;
  try {
    for (const id of ids) {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("tick timeout")), 30000)
      );
      try {
        await Promise.race([
          supabase.functions.invoke(
            `queue-executor?campaign_id=${id}&action=tick`,
            { method: "POST" }
          ),
          timeoutPromise,
        ]);
      } catch (e) {
        console.error(`[global-queue-tick] error for ${id}:`, e);
      }
      if (id !== ids[ids.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    queryClient.invalidateQueries({ queryKey: ["queue_execution_state_all"] });
    queryClient.invalidateQueries({ queryKey: ["call_operators"] });
  } catch (e) {
    console.error("[global-queue-tick] fatal error:", e);
  } finally {
    tickInFlightRef.current = false;
  }
}, [queryClient]);
```

4. **Garantir cleanup do ref no efeito**:
```typescript
useEffect(() => {
  if (activeIds.length === 0) return;
  
  // Reset in case previous cycle left it stuck
  tickInFlightRef.current = false;
  
  tickAll();
  const interval = setInterval(tickAll, 8000);
  return () => {
    clearInterval(interval);
    tickInFlightRef.current = false;
  };
}, [activeIds.length, tickAll]);
```

### Resultado esperado

- O tick loop não pode mais travar por promises penduradas (timeout de 30s).
- Logs de console ajudam a diagnosticar problemas futuros.
- O `tickInFlightRef` é resetado quando o efeito é recriado, evitando deadlocks.
- Impacto: apenas `src/hooks/useQueueExecution.ts`.

