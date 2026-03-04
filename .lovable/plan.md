

## Botão "Ver Detalhes" abre o CallActionDialog

### Situação Atual
O botão Eye na fila abre um `Dialog` simples com grid de dados (nome, telefone, campanha, tentativa, status, observações). O usuário quer que abra o `CallActionDialog` completo — o mesmo card usado pelos operadores durante ligações.

### Problema
O `CallActionDialog` requer um `callId` (registro em `call_logs`) para funcionar — usa para salvar ações, liberar operador, navegar histórico. Itens na fila (`call_queue`) **não têm `call_log` ainda**.

### Solução
Abrir o `CallActionDialog` passando `callId` vazio/placeholder e `callStatus` como `"queued"`. No `CallActionDialog`, quando `callStatus === "queued"`:
- Mostrar o card completo (header com lead info, roteiro, ações da campanha, histórico)
- **Esconder** o botão "Salvar" e a seção de reagendamento (não há call_log para atualizar)
- **Esconder** navegação anterior/avançar (não é contexto de operador)
- Manter script runner e histórico de ligações anteriores funcionais

### Arquivos a alterar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/operator/CallActionDialog.tsx` | Detectar `callStatus === "queued"` para esconder save/reschedule/navigation |
| `src/pages/CallPanel.tsx` | Substituir o `Dialog` simples pelo `CallActionDialog` quando clicar no Eye |

### Detalhes

**CallPanel.tsx:**
- Remover o `Dialog` simples de `viewingQueueLead` (linhas ~1533-1581)
- No click do Eye, abrir `CallActionDialog` com os dados do queue item:
  - `callId = ""` (sem call_log)
  - `campaignId`, `leadId`, `leadName`, `leadPhone`, `campaignName`, `attemptNumber`, `maxAttempts`, `isPriority` do queue item
  - `duration = 0`, `callStatus = "queued"`

**CallActionDialog.tsx:**
- Adicionar `const isQueuePreview = callStatus === "queued" || !currentData.callId;`
- Quando `isQueuePreview`:
  - Não renderizar botão "Salvar" / footer de ações rápidas
  - Não renderizar `InlineReschedule`
  - Não renderizar botões Anterior/Avançar
  - Mostrar status badge como "Na Fila" em vez de "dialing"
  - Script runner e histórico continuam funcionando (usam `campaignId`/`leadId`)

