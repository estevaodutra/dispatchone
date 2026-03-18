
Objetivo

Corrigir a reclassificação em lote para que ela realmente alcance eventos como:
- `94a5f3c4-2408-41b8-91e7-64991eba6583`
- `87b07c33-1a47-43f0-8fa6-19b2d0ad9447`

Diagnóstico confirmado

- Esses eventos ainda estão salvos como `image_message`.
- Ambos têm `raw_event.body.pollVote`, então deveriam virar `poll_response`.
- O payload também tem `body.photo`, mas isso não deveria ganhar da regra de `pollVote`.
- A lógica de classificação já está correta nos dois functions: `pollVote` é checado primeiro.
- O problema real está na paginação da reclassificação em lote.

Causa raiz

Hoje o backend retorna `has_more` e `last_id`, mas o frontend chama `reclassify-events` repetidamente sem enviar o cursor da página anterior.

Fluxo atual:
```text
1. chamada #1 processa primeiros N IDs
2. backend retorna has_more=true e last_id=...
3. frontend chama de novo sem last_id
4. backend recomeça do início
5. eventos mais à frente nunca são alcançados
```

Isso explica por que “Reclassificar Tudo” não chega nesses IDs específicos.

Plano de implementação

1. Tornar a reclassificação realmente resumível
- Em `supabase/functions/reclassify-events/index.ts`, aceitar um cursor de entrada (`last_id` ou `cursor`).
- Iniciar a busca com `.gt("id", cursor)` quando esse valor vier do frontend.
- Continuar retornando `has_more` e o cursor final da página.

2. Corrigir o loop do frontend
- Em `src/hooks/useWebhookEvents.ts`, permitir enviar `last_id` ao invocar a function.
- Em `src/pages/WebhookEvents.tsx`, guardar o `last_id` retornado e reenviá-lo na próxima iteração do loop.
- Encerrar apenas quando `has_more` for `false`.

3. Priorizar candidatos realmente suspeitos
- Manter o filtro atual por tipos propensos a erro (`image_message`, `unknown`, `text_message`).
- Refinar a seleção para priorizar especialmente registros com `raw