
# Corrigir atribuicao de operador e status "Discando"

## Problema

1. O dialogo "Atribuir Operador em Massa" nao funciona para chamadas com status `dialing` porque o filtro so aceita `scheduled` e `ready`.
2. Existem dezenas de chamadas travadas em "Discando" que precisam ser revertidas para "Agora!" (status `ready`).

## Solucao

### 1. Arquivo: `src/pages/CallPanel.tsx` (linha 1067)

Expandir o filtro do dialogo de atribuicao de operador em massa para incluir `dialing` e `ringing`:

```typescript
// De:
const toUpdate = entries.filter(e => selectedIds.has(e.id) && ["scheduled", "ready"].includes(e.callStatus));

// Para:
const toUpdate = entries.filter(e => selectedIds.has(e.id) && ["scheduled", "ready", "dialing", "ringing"].includes(e.callStatus));
```

Quando a chamada estiver em `dialing` ou `ringing`, alem de atribuir o operador, o sistema tambem reverte o status para `ready` (liberando o operador anterior se houver).

### 2. Arquivo: `src/hooks/useCallPanel.ts` -- mutacao `bulkUpdateOperator`

Atualizar a mutacao para que, ao processar chamadas em `dialing` ou `ringing`, tambem:
- Reverta o `call_status` para `ready`
- Limpe `started_at` e libere o operador anterior (reset `current_call_id` e status para `available`)
- Reverta o lead para `pending`

### 3. Adicionar botao "Reverter para Agora!" no menu de acoes em massa

Adicionar uma acao no banner de selecao em massa que converte todas as chamadas `dialing` selecionadas para status `ready` de uma so vez, sem precisar passar pelo dialogo de operador. Isso permite limpar rapidamente todas as chamadas travadas.

Isso resolve ambos os problemas: o dialogo de operador passa a funcionar para chamadas "Discando" e existe uma acao direta para reverter o status em massa.
