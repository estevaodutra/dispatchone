

## Plano: Corrigir extração de senderPhone para votos de enquete

### Problema
Quando um voto de enquete chega, o `extractZApiContext` não encontra o campo `participantPhone` do Z-API. Ele cai no fallback `chatJid.split("@")[0]`, que retorna o número do grupo (`120363427443466552-group`) em vez do telefone do votante (`5511961001546`).

O log confirma: `Lead 120363427443466552-group added to execution list`.

### Correção

**`supabase/functions/_shared/event-classifier.ts`** — função `extractZApiContext`, bloco de extração de `senderPhone` (linhas 559-564):

Adicionar `body?.participantPhone` à lista de fontes:

```typescript
let senderPhone = (
  sender?.phone ||
  rawEvent.senderPhone ||
  body?.senderPhone ||
  body?.participantPhone ||    // ← Z-API poll votes use this field
  rawEvent.participant as string
) as string | null;
```

### Impacto
- Corrige a acumulação automática de leads na Lista de Execução para eventos `poll_response`
- O auto-processamento de enquete (que já extrai `participantPhone` manualmente nas linhas 142-143 do webhook-inbound) não é afetado
- Não quebra nenhum outro fluxo, pois é apenas mais uma fonte de fallback

### Arquivos
- `supabase/functions/_shared/event-classifier.ts`

