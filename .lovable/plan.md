
# Corrigir: Fila em execucao nao esta discando automaticamente

## Problema Identificado

O motor da fila tem uma falha arquitetural critica: **nao existe um loop automatico que chame o `queue-executor?action=tick` periodicamente**. 

Quando o usuario clica "Iniciar", o hook `useQueueExecution` apenas atualiza o status no banco para `"running"`, mas ninguem dispara os ticks. O `queue-executor` so e chamado como efeito colateral de acoes manuais no `useCallPanel` (discar, no-answer), mas nunca de forma autonoma.

Resultado: a fila fica marcada como "Em execucao" mas nenhuma ligacao e processada.

## Solucao

Adicionar um **loop de tick no cliente** dentro do hook `useQueueExecution`. Enquanto o status for `"running"` ou `"waiting_operator"` ou `"waiting_cooldown"`, o hook dispara automaticamente o `queue-executor?action=tick` a cada N segundos (usando o intervalo da campanha, com minimo de 10s).

### Arquivo: `src/hooks/useQueueExecution.ts`

**Mudancas no hook `useQueueExecution`:**

1. Receber `intervalSeconds` como parametro (default 30)
2. Adicionar um `useEffect` que cria um `setInterval` para chamar o tick automaticamente enquanto a fila estiver ativa
3. Disparar o primeiro tick imediatamente ao iniciar a fila (no `onSuccess` do `startMutation`)
4. Disparar um tick ao retomar a fila (no `onSuccess` do `resumeMutation`)
5. Limpar o interval ao parar/pausar

```
Logica do loop:

useEffect:
  se status in ['running', 'waiting_operator', 'waiting_cooldown']:
    chamar tick() imediatamente
    criar setInterval(tick, max(intervalSeconds, 10) * 1000)
  senao:
    limpar interval
  
  cleanup: limpar interval
```

A funcao `tick` chama `supabase.functions.invoke('queue-executor?campaign_id=X&action=tick')` e invalida o cache do estado apos a resposta.

### Impacto

- A fila passara a processar leads automaticamente enquanto estiver "Em execucao"
- O `queue-executor` ja trata toda a logica de round-robin, cooldown, self-healing e webhook -- so precisa ser chamado
- Se nao houver operador disponivel, o executor ja muda o status para `waiting_operator` -- o loop continua tentando ate encontrar
- Nenhuma mudanca no backend e necessaria

### Arquivo modificado

| Arquivo | Mudanca |
|---|---|
| `src/hooks/useQueueExecution.ts` | Adicionar loop de tick automatico via useEffect + setInterval enquanto a fila estiver ativa |
