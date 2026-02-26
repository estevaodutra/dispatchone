

## Diagnóstico

O botão "Ligar Agora" (`dialNow` no `useCallPanel.ts`) **não passa pela Edge Function `call-dial`**. Ele executa tudo no frontend:

1. Reserva operador via RPC (`reserve_operator_for_call`)
2. Chama `webhook-proxy` diretamente
3. Mostra toast de sucesso

Consequências:
- **Não cria entrada em `api_logs`** (somente `call-dial` e `call-status` logam)
- **Não valida max attempts** (os leads da screenshot mostram "2/2 ❌" mas o botão continua ativando)
- O toast "Ligação iniciada / Webhook acionado com sucesso" aparece porque o `webhook-proxy` retorna 200, mas a ligação pode não ter sido efetivamente iniciada pelo provedor

## Solução

Adicionar logging de API e validação de tentativas no fluxo `dialNow`.

### 1. `src/hooks/useCallPanel.ts` — `dialNowMutation`

**Validar max attempts** antes de prosseguir:
```typescript
// Antes de reservar operador
const { data: logData } = await supabase
  .from("call_logs")
  .select("attempt_number, max_attempts")
  .eq("id", callId)
  .single();

if (logData && logData.max_attempts && logData.attempt_number >= logData.max_attempts) {
  throw new Error("Máximo de tentativas atingido para este lead");
}
```

**Adicionar log em `api_logs`** após webhook (sucesso ou erro):
```typescript
// Após o webhook-proxy retornar
await supabase.from("api_logs").insert({
  method: "POST",
  endpoint: "/call-dial",
  status_code: proxyData?.status || 200,
  response_time_ms: Date.now() - startTs,
  user_id: user?.id,
  request_body: payload,
  response_body: { source: "dialNow", call_id: callId, webhook_status: proxyData?.status },
});
```

**Logar também em caso de erro do webhook**:
```typescript
// No catch do webhook
await supabase.from("api_logs").insert({
  method: "POST",
  endpoint: "/call-dial",
  status_code: 502,
  response_time_ms: Date.now() - startTs,
  user_id: user?.id,
  request_body: payload,
  error_message: webhookError.message,
});
```

### 2. Desabilitar botão "Ligar" visualmente para 2/2

Na UI do `CallPanel.tsx`, desabilitar o ícone de discagem quando `attempt_number >= max_attempts`.

---

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useCallPanel.ts` | Adicionar validação de max attempts e logging em `api_logs` no `dialNowMutation` |
| `src/pages/CallPanel.tsx` | Desabilitar botão "Ligar" quando tentativas esgotadas |

