

## Problema

O hook `useQueueExecutionSummary` é instanciado **duas vezes simultaneamente**:
1. Em `AppLayout.tsx` (global, roda em todas as páginas)
2. Em `CallPanel.tsx` (quando o operador está no painel de ligações)

Cada instância cria seus próprios `setInterval` independentes:
- **Tick loop**: 8s cada → na prática 4s entre ticks (2 instâncias)
- **Maintenance loop**: 10s cada → 5s entre manutenções
- **Query refetch**: 5s cada instância
- **Maintenance resolve_cooldowns** dispara tick imediato → mais sobreposição

Resultado: chamadas ao `queue-executor` se empilham, logs mostram "processing" e "skipped (in-flight)" a cada 2-3 segundos.

## Solução

Fazer o `CallPanel` **reutilizar os dados** do hook global ao invés de criar uma segunda instância com loops próprios.

### 1. `src/hooks/useQueueExecution.ts` — separar dados de loop

Criar um hook leve `useQueueExecutionData()` que apenas lê os dados (usa a mesma `queryKey`), sem criar intervals de tick/maintenance. O `CallPanel` usará esse hook.

```typescript
// Hook leve — apenas lê os dados, sem loops
export function useQueueExecutionData(): QueueExecutionSummary {
  const queryClient = useQueryClient();

  const { data: states = [], isLoading } = useQuery({
    queryKey: ["queue_execution_state_all"],  // mesma key = compartilha cache
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("queue_execution_state")
        .select("*");
      if (error) throw error;
      return (data || []).map((d: DbQueueState) => transform(d));
    },
    refetchInterval: 5000,
  });

  // Mesma lógica de summary/globalStatus
  // Mutations pauseAll/resumeAll
  // Mas SEM setInterval, SEM tick loop, SEM maintenance loop
}
```

### 2. `src/pages/CallPanel.tsx` — usar hook leve

Substituir:
```typescript
import { useQueueExecutionSummary } from "@/hooks/useQueueExecution";
const queueSummary = useQueueExecutionSummary();
```
Por:
```typescript
import { useQueueExecutionData } from "@/hooks/useQueueExecution";
const queueSummary = useQueueExecutionData();
```

### 3. `src/components/layout/AppLayout.tsx` — sem mudanças

Continua com `useQueueExecutionSummary()` como único ponto de execução dos loops.

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useQueueExecution.ts` | Criar `useQueueExecutionData()` — hook que lê dados sem criar loops |
| `src/pages/CallPanel.tsx` | Trocar `useQueueExecutionSummary` por `useQueueExecutionData` |

Isso elimina a duplicação de intervals e reduz as chamadas ao `queue-executor` pela metade.

