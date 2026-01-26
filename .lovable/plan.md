
# Plano: Adicionar Botao "Reclassificar Tudo"

## Objetivo

Adicionar um botao na pagina de Eventos que reprocessa TODOS os eventos existentes usando a logica de classificacao atualizada da Edge Function, aplicando novas deteccoes (como "reaction") a eventos previamente classificados como "unknown".

---

## Arquivos a Modificar

| Arquivo | Acao |
|---------|------|
| `supabase/functions/reclassify-events/index.ts` | Criar nova Edge Function |
| `supabase/config.toml` | Registrar a nova funcao |
| `src/hooks/useWebhookEvents.ts` | Adicionar hook `useReclassifyAllEvents` |
| `src/pages/WebhookEvents.tsx` | Adicionar botao "Reclassificar Tudo" |

---

## Arquitetura da Solucao

```text
+---------------------+       +--------------------------+       +------------------+
| Botao UI            | ----> | Edge Function            | ----> | webhook_events   |
| "Reclassificar Tudo"|       | reclassify-events        |       | (UPDATE rows)    |
+---------------------+       +--------------------------+       +------------------+
                                      |
                                      v
                              Mesma logica de
                              classifyZApiEvent()
                              extractContext()
```

---

## Implementacao

### 1. Nova Edge Function: `reclassify-events`

A funcao ira:
1. Buscar todos os eventos do usuario (ou apenas os "pending"/"unknown")
2. Reprocessar cada `raw_event` usando a mesma logica de classificacao
3. Atualizar os campos `event_type`, `event_subtype`, `classification` e contexto
4. Retornar contagem de eventos atualizados

Parametros opcionais:
- `only_pending`: Se `true`, reprocessa apenas eventos com `classification = 'pending'`
- `only_unknown`: Se `true`, reprocessa apenas eventos com `event_type = 'unknown'`

### 2. Hook: `useReclassifyAllEvents`

```typescript
export function useReclassifyAllEvents() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (options?: { onlyPending?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('reclassify-events', {
        body: { only_pending: options?.onlyPending }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-events"] });
      queryClient.invalidateQueries({ queryKey: ["webhook-events-stats"] });
    },
  });
}
```

### 3. Botao na UI

Adicionar junto aos botoes existentes no header:

```tsx
<Button 
  variant="outline" 
  size="sm" 
  onClick={handleReclassifyAll}
  disabled={isReclassifying}
>
  <RotateCw className={cn("mr-2 h-4 w-4", isReclassifying && "animate-spin")} />
  Reclassificar Tudo
</Button>
```

---

## Fluxo do Usuario

1. Usuario clica em "Reclassificar Tudo"
2. Sistema mostra toast "Reclassificando eventos..."
3. Edge Function processa todos os eventos
4. Sistema mostra toast "X eventos reclassificados"
5. Tabela e stats sao atualizados automaticamente

---

## Beneficios

1. **Retroativo**: Aplica novas classificacoes a eventos antigos
2. **Correcao em massa**: Corrige eventos que foram classificados incorretamente
3. **Simples**: Um clique para reprocessar tudo
4. **Seguro**: Usa mesma logica da funcao de inbound

---

## Secao Tecnica

### Logica de Classificacao (duplicada na nova Edge Function)

A nova Edge Function contera copia das funcoes:
- `classifyZApiEvent()`
- `classifyEvolutionEvent()`
- `classifyMetaEvent()`
- `classifyEvent()`
- `extractZApiContext()`
- `extractContext()`

Estas funcoes serao identicas as da `webhook-inbound` para garantir consistencia.

### Query de Busca

```typescript
const { data: events } = await supabase
  .from("webhook_events")
  .select("id, source, raw_event")
  .eq("user_id", userId)
  .order("received_at", { ascending: false })
  .limit(1000);
```

### Query de Update (em batch)

```typescript
for (const event of events) {
  const classification = classifyEvent(event.source, event.raw_event);
  const context = extractContext(event.source, event.raw_event);
  
  await supabase
    .from("webhook_events")
    .update({
      event_type: classification.eventType,
      event_subtype: classification.eventSubtype,
      classification: classification.classification,
      chat_jid: context.chatJid,
      // ... demais campos de contexto
    })
    .eq("id", event.id);
}
```

### Resposta da Edge Function

```json
{
  "success": true,
  "total_processed": 150,
  "reclassified": 23,
  "unchanged": 127
}
```
