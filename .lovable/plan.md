
## Correção do Botão "Reclassificar Tudo"

### Problema Identificado

O botão "Reclassificar Tudo" processou **1000 eventos** e **0 foram alterados**, mesmo existindo eventos como o seu `READ_BY_ME` que estavam como `unknown/pending`.

**Causa raiz:** O batch processing (quando não há `event_id`) usa uma condição `hasChanged` diferente do single-event processing. O batch não verifica corretamente se precisa atualizar o evento.

### Diagnóstico

1. **Single event (com `event_id`)** - Funciona corretamente:
   - Usa `force: true` que força a atualização
   - Verifica `processing_status !== expectedStatus`
   - O teste manual confirmou que funciona

2. **Batch processing (sem `event_id`)** - Problema:
   - A condição `hasChanged` (linhas 619-623) verifica apenas `event_type`, `classification` e `processing_status`
   - Mas **NÃO FORÇA** a reclassificação quando o evento ainda está como `unknown`
   - Resultado: eventos `unknown` continuam `unknown`

### Análise do Código Atual (linhas 619-623)

```typescript
const hasChanged = 
  event.event_type !== classification.eventType ||
  event.classification !== classification.classification ||
  event.processing_status !== expectedStatus;
```

O problema é que se um evento foi armazenado como `unknown` mas a lógica de classificação agora retorna `read_by_me`, a comparação deveria detectar isso. Vou verificar se há algum problema na extração do `raw_event` no batch.

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/reclassify-events/index.ts` | Adicionar logs de debug para batch processing para identificar porque não está detectando mudanças |

### Mudança Técnica

Adicionar logging detalhado no loop de batch processing para entender porque eventos como `READ_BY_ME` não estão sendo detectados como "changed":

```typescript
// Dentro do loop de eventos (por volta da linha 615)
console.log(`[reclassify-events] Processing ${event.id}: 
  current=${event.event_type}/${event.classification}/${event.processing_status}
  new=${classification.eventType}/${classification.classification}/${expectedStatus}
  hasChanged=${hasChanged}`);
```

Além disso, preciso verificar se o `raw_event` está sendo lido corretamente no batch - pode haver um problema com o tipo de dado ou estrutura.

### Resumo

O problema é que o batch processing não está detectando que eventos `unknown` deveriam ser reclassificados. Preciso adicionar debug logging para identificar exatamente onde está falhando e então corrigir a condição.

### Próximos Passos

1. Adicionar logs detalhados no batch processing
2. Deploy da função
3. Executar "Reclassificar Tudo" novamente
4. Verificar os logs para entender onde está falhando
5. Corrigir a lógica baseado nos findings
