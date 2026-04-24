

## Plano: Expor telefone do respondente em local mais previsível no payload do webhook de poll

### Diagnóstico

Para o evento da campanha Maestria (poll `Modelo de Enquete`):

- `webhook_events.sender_phone = 5512983195531` (extração correta no nosso lado)
- O payload enviado ao n8n já contém `respondent.phone` corretamente
- O n8n retornou **HTTP 500** para essa chamada, indicando que o workflow do n8n falhou ao processar — provavelmente porque está tentando ler o telefone num caminho diferente do que enviamos (ex: campo top-level `phone`, ou estrutura achatada)

Outros 4 votos no mesmo período retornaram 200 (URL n8n diferente). Logo o telefone existe no payload — só não está num caminho que o workflow `datacrazy` consegue ler.

### Mudança proposta no payload do webhook (handle-poll-response, action `call_webhook`)

Acrescentar campos achatados no topo do payload, mantendo a estrutura aninhada já existente para retrocompatibilidade. O payload passa de:

```json
{
  "event": "poll_vote",
  "poll": { ... },
  "vote": { "option_index": 0, "option_text": "..." },
  "respondent": { "phone": "5512...", "name": "...", "jid": "..." },
  "group": { "jid": "..." }
}
```

Para:

```json
{
  "event": "poll_vote",
  "phone": "5512983195531",          // ← novo (top-level)
  "name": "Estevão Dutra",            // ← novo (top-level)
  "option": "PERGUNTA 1 (Lead Quente)", // ← novo (top-level)
  "option_index": 0,                  // ← novo (top-level)
  "group_jid": "120363424430105624-group", // ← novo (top-level)
  "poll": { ... },
  "vote": { ... },
  "respondent": { ... },
  "group": { ... },
  "instance": { ... }
}
```

Isso permite que workflows externos (n8n, Make, Zapier) leiam `body.phone` diretamente sem precisar navegar `body.respondent.phone`.

### Diagnóstico extra

Adicionar log que imprime o JSON completo enviado ao webhook e o status/corpo da resposta no `console.log`, para futuras depurações ficarem visíveis em `edge_function_logs`.

### Arquivos afetados

- `supabase/functions/handle-poll-response/index.ts` — adicionar campos top-level no `basePayload` do case `call_webhook` (linhas 542-566) + log do payload e da resposta de erro

### Comportamento final

- Workflow do n8n consegue ler `{{$json.phone}}` direto, sem precisar de `{{$json.respondent.phone}}`
- Estrutura aninhada existente preservada (zero quebra para integrações já configuradas)
- Logs mostram o payload exato enviado, facilitando debug de 500 do lado do destinatário

### Fora deste escopo

- Investigar por que o workflow `datacrazy` no n8n retornou 500 (do lado do usuário, não do código DispatchOne)
- Reprocessamento automático em caso de 5xx (já existe a opção manual de reprocessar via UI de logs)

