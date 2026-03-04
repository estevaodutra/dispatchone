

## Diagnóstico: "O reprodutor da ligação desapareceu"

O componente `CallPopup embedded` (o card de status do operador no topo do Painel) usa o hook `useOperatorCall`, que **não foi alterado**. Porém, o filtro que adicionamos em `inProgressEntries` pode estar causando o desaparecimento do **card de ligação na aba "Em Andamento"**.

### Causa provável

No filtro que adicionamos (linha 394-400 de `CallPanel.tsx`):

```ts
if (myOperator) {
  return all.filter(e => e.operatorId === myOperator.id);
}
```

Quando o `queue-processor` inicia uma ligação, pode haver um breve intervalo onde o `call_log` já existe com status `dialing` mas o `operator_id` ainda não foi populado (ou o polling do `useCallPanel` busca o registro antes do update). Nesse caso, `entry.operatorId` é `null`, e o filtro exclui o card.

Além disso, chamadas originadas de `processScheduledCallLogs` podem ter o `operator_id` setado de forma assíncrona, gerando uma janela de tempo onde o card some.

### Solução

**Arquivo: `src/pages/CallPanel.tsx` (linhas 394-400)**

Ajustar o filtro para incluir também entradas sem `operatorId` definido (ainda não foram atribuídas a nenhum operador):

```ts
const inProgressEntries = useMemo(() => {
  const all = entries.filter(e => ["dialing", "ringing", "answered", "in_progress"].includes(e.callStatus));
  if (myOperator) {
    return all.filter(e => !e.operatorId || e.operatorId === myOperator.id);
  }
  return all;
}, [entries, myOperator]);
```

A adição de `!e.operatorId ||` garante que ligações recém-criadas (sem operador atribuído ainda) permaneçam visíveis para todos os operadores, evitando o "desaparecimento" do card durante a fase de atribuição.

