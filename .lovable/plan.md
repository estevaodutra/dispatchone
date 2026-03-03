

## Problema

O timer de cooldown no `useOperatorCall.ts` (linhas 354-357) causa uma race condition:

```typescript
if (remaining <= 0) {
  setCallStatus("idle");    // ← WIPES new call status
  setCurrentCall(null);     // ← WIPES new call data
  setCooldownRemaining(0);
}
```

**Sequência do bug:**
1. Chamada anterior termina → operador entra em `cooldown` → timer inicia countdown
2. `resolve_cooldowns` RPC transiciona operador para `available` → realtime event chega
3. `reserve_operator_for_call` atribui nova chamada → realtime event atualiza `callStatus("dialing")` e carrega `currentCall`
4. **Mas** o `setInterval` do cooldown (1s) ainda está rodando. Quando `remaining` chega a 0, ele executa `setCurrentCall(null)` e `setCallStatus("idle")`, apagando a nova chamada que acabou de ser carregada

O problema é que o timer do cooldown **assume controle do estado da chamada** quando deveria apenas gerenciar o `cooldownRemaining`.

## Correção

**1 arquivo**: `src/hooks/useOperatorCall.ts`

No callback do cooldown timer (linhas 354-357), remover `setCallStatus("idle")` e `setCurrentCall(null)`. Apenas setar `setCooldownRemaining(0)`. A transição real de estado é tratada pelo handler de realtime (linha 310-315), que já limpa tudo quando o operador vai para `available`.

```typescript
if (remaining <= 0) {
  setCooldownRemaining(0);
  // NÃO limpar callStatus/currentCall aqui
  // O realtime handler cuida disso quando resolve_cooldowns roda
}
```

Isso é seguro porque:
- Quando `resolve_cooldowns` transiciona o operador para `available`, o realtime handler (linha 310) detecta `status === "available" && !newCallId` e limpa o estado
- Se uma nova chamada já foi atribuída, o realtime handler (linha 277) já carregou os dados — o timer não vai sobrescrever

