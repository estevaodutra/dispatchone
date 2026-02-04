
# Plano: Adicionar Categoria "Ligacoes" nos Webhooks

Adicionar uma nova categoria de webhook para eventos relacionados ao modulo de Campanhas de Ligacao.

---

## Alteracao

| Arquivo | Alteracao |
|---------|-----------|
| `src/data/webhook-categories.ts` | Adicionar nova categoria "calls" apos "groups" (linha ~96) |

---

## Nova Categoria

```typescript
{
  id: "calls",
  name: "Ligações",
  description: "Eventos relacionados a campanhas de ligação telefônica",
  defaultUrl: "",
  actions: [
    // Request actions (Dispatch -> n8n)
    { id: "call.dial", name: "call.dial", description: "Iniciar ligação", type: "request" },
    { id: "call.hangup", name: "call.hangup", description: "Encerrar ligação", type: "request" },
    { id: "call.transfer", name: "call.transfer", description: "Transferir ligação", type: "request" },
    { id: "call.hold", name: "call.hold", description: "Colocar em espera", type: "request" },
    { id: "call.resume", name: "call.resume", description: "Retomar ligação", type: "request" },
    // Event actions (n8n -> Dispatch)
    { id: "call.started", name: "call.started", description: "Ligação iniciada", type: "event" },
    { id: "call.answered", name: "call.answered", description: "Ligação atendida", type: "event" },
    { id: "call.ended", name: "call.ended", description: "Ligação encerrada", type: "event" },
    { id: "call.failed", name: "call.failed", description: "Falha na ligação", type: "event" },
    { id: "call.busy", name: "call.busy", description: "Linha ocupada", type: "event" },
    { id: "call.no_answer", name: "call.no_answer", description: "Sem resposta", type: "event" },
  ],
}
```

---

## Resultado

A nova categoria "Ligacoes" aparecera na secao "Configurar Webhooks" da documentacao da API, permitindo configurar URLs para receber eventos de ligacoes telefonicas integradas com a API4com.
