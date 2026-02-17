
# Operador "Auto" para chamadas nao atendidas

## Problema

Chamadas com status "AGORA!" (ready) e "waiting_operator" estao mostrando o nome do operador mesmo antes da ligacao ser atendida. O operador so deve aparecer quando a chamada efetivamente foi conectada.

## Solucao

### Arquivo: `src/pages/CallPanel.tsx` (linha 774)

Expandir a condicao que exibe "Auto" para cobrir todos os status da categoria "scheduled" (que inclui `scheduled`, `ready` e `waiting_operator`):

```typescript
// De:
{entry.operatorName && entry.callStatus !== "scheduled" ? (

// Para:
{entry.operatorName && !["scheduled", "ready", "waiting_operator"].includes(entry.callStatus) ? (
```

Assim, o nome do operador so aparece quando a chamada ja esta em andamento (`dialing`, `ringing`, `answered`, `in_progress`) ou finalizada (`completed`, `failed`, etc). Chamadas pendentes sempre mostram "Auto".
