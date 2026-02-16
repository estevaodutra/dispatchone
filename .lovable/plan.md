
# Corrigir: Ticks nao sao disparados no Painel de Ligacoes

## Problema Raiz

O loop automatico de ticks (que chama `queue-executor?action=tick`) so e executado quando o usuario esta na pagina de detalhes de uma campanha especifica, dentro do componente `QueueControlPanel`. 

No Painel de Ligacoes (`/painel-ligacoes`), o hook `useQueueExecutionSummary()` apenas le o estado da fila -- ele nao dispara ticks. Resultado: a fila mostra "Em execucao" mas nenhuma ligacao e processada enquanto o usuario esta nessa tela.

## Solucao

Adicionar um mecanismo de tick automatico dentro do `useQueueExecutionSummary` que dispara ticks para todas as campanhas com status ativo (`running`, `waiting_operator`, `waiting_cooldown`).

## Detalhes Tecnicos

### Arquivo: `src/hooks/useQueueExecution.ts`

Modificar o hook `useQueueExecutionSummary` para:

1. Detectar quais campanhas tem status ativo (`running`, `waiting_operator`, `waiting_cooldown`)
2. Criar um `useEffect` com `setInterval` que, a cada 15 segundos, dispara um tick para cada campanha ativa
3. Usar um `useRef` para controlar concorrencia (evitar ticks sobrepostos)
4. O tick chama `supabase.functions.invoke('queue-executor?campaign_id=X&action=tick')` para cada campanha ativa
5. Apos os ticks, invalida os caches relevantes (`queue_execution_state_all`, `call_operators`)

```
Logica:

useEffect:
  se existem campanhas ativas:
    criar setInterval(tickAll, 15000)
    tickAll imediatamente na primeira execucao
  senao:
    limpar interval

  tickAll:
    se ja em execucao, ignorar
    para cada campanha com status ativo:
      chamar queue-executor?campaign_id=X&action=tick
    invalidar caches
```

### Impacto

- O Painel de Ligacoes passara a disparar ticks automaticamente para todas as campanhas ativas
- Nao importa em qual tela o usuario esteja -- se houver campanhas ativas, elas serao processadas
- Sem mudancas no backend

### Arquivo modificado

| Arquivo | Mudanca |
|---|---|
| `src/hooks/useQueueExecution.ts` | Adicionar loop de tick automatico dentro de `useQueueExecutionSummary` para todas as campanhas ativas |
