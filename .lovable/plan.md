

# Corrigir categorização do status "waiting_operator"

## Problema

O status `waiting_operator` cai no `return "failed"` (caso default) da função `getStatusCategory`, fazendo com que apareça na aba "Falhas". O correto é tratá-lo como uma chamada na fila/agendada, pois está apenas aguardando um operador disponível.

## Solução

### Arquivo: `src/pages/CallPanel.tsx` (linha 134)

Adicionar `waiting_operator` à lista de status categorizados como "scheduled":

```typescript
// De:
if (["scheduled", "ready"].includes(status)) return "scheduled";

// Para:
if (["scheduled", "ready", "waiting_operator"].includes(status)) return "scheduled";
```

Isso faz com que chamadas com status `waiting_operator`:
- Apareçam na aba "Agendadas" em vez de "Falhas"
- Recebam o visual correto (destaque de agendada, não de falha)
- Sejam ordenadas junto com as demais chamadas pendentes

Também atualizar o label no `getStatusLabel` do componente `LeadCallHistory` (linha 1267) para exibir "Aguardando Operador" no histórico, adicionando a entrada ao mapa de labels.

