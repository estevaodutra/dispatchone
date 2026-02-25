

## Plano: Transição imediata do card após ligação encerrar

### Problema

Quando a ligação termina (status terminal no `call_logs`), o card do operador continua exibindo todas as informações da chamada ("FINALIZADA" + dados do lead) porque o frontend aguarda a atualização do `call_operators` via Realtime para iniciar o cooldown. Existe um gap entre:

1. `call_logs` atualiza para status terminal → UI mostra "FINALIZADA" mas mantém card expandido
2. `release_operator` RPC executa → `call_operators` atualiza para "cooldown"
3. Realtime do `call_operators` dispara → UI finalmente mostra cooldown

O delay está entre os passos 1 e 3, que pode levar vários segundos dependendo da latência do backend + Realtime.

### Solução

No handler de Realtime do `call_logs` (dentro de `useOperatorCall.ts`, linhas 118-127), ao detectar um status terminal, limpar o `currentCall` imediatamente e forçar a transição para o estado correto sem aguardar o Realtime do `call_operators`.

### Alteração

**Arquivo:** `src/hooks/useOperatorCall.ts`

Na subscription do `call_logs` (linhas 115-131), expandir o handler para:

1. Quando o status mapeado for `"ended"`, `"no_answer"` ou `"failed"` (terminais), limpar `currentCall` após 2 segundos com um timer
2. Se durante esses 2 segundos o operador já transicionar para cooldown (via o outro canal Realtime), o timer é cancelado naturalmente

```typescript
// Dentro do handler de call_logs UPDATE:
const mapped = mapDbStatus(newStatus);
setCallStatus(mapped);

// Terminal status detected — clear card after brief delay
if (["ended", "no_answer", "failed"].includes(mapped)) {
  setTimeout(() => {
    // Only clear if still showing same call (operator channel may have already handled it)
    setCurrentCall(prev => {
      if (prev?.id === callId) {
        setCallDuration(0);
        return null;
      }
      return prev;
    });
    // If not already in cooldown, go to idle
    setCallStatus(prev => prev !== "idle" && prev !== "ended" ? prev : "idle");
  }, 2000);
}
```

Também adicionar um `useRef` para o timer, para poder cancelá-lo quando o canal do `call_operators` disparar o cooldown (evitando conflito).

### Resultado

- Card some em ~2 segundos após status terminal, mesmo se o Realtime do operador demorar
- Se o cooldown chegar antes dos 2s, o timer é ignorado (estado já mudou)
- Não afeta o fluxo normal: cooldown continua funcionando via canal do operador

### Arquivos impactados

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useOperatorCall.ts` | Adicionar timer de auto-clear no handler de call_logs terminal |

