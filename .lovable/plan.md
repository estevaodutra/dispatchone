

# Adicionar opcao "Esvaziar Fila"

## Resumo

Adicionar um botao "Esvaziar Fila" no banner de status da aba Fila que remove todos os itens de uma vez -- tanto os registros da tabela `call_queue` (status `waiting`) quanto os `call_logs` com status `ready`. O botao tera um dialogo de confirmacao para evitar cliques acidentais.

## Alteracoes

### 1. Hook `useCallQueuePanel.ts` -- nova mutacao `clearQueue`

Adicionar uma mutacao que:
- Deleta todos os registros de `call_queue` com status `waiting` (filtrado por campanha se houver filtro ativo)
- Atualiza todos os `call_logs` com status `ready` para `cancelled` (filtrado por campanha se houver filtro ativo)
- Invalida os caches relevantes (`call-queue-panel`, `call-queue`)

### 2. Componente `QueueStatusBanner` em `CallPanel.tsx`

- Adicionar prop `onClearQueue` e `isClearingQueue`
- Adicionar um botao "Esvaziar Fila" com icone `Trash2` no banner
- O botao abre um `AlertDialog` de confirmacao com mensagem "Tem certeza que deseja esvaziar toda a fila? Essa acao nao pode ser desfeita."

### 3. Integracao no componente principal `CallPanel`

- Passar `clearQueue` e `isClearingQueue` do hook para o `QueueStatusBanner`
- Exibir o botao somente quando houver itens na fila (`totalWaiting > 0`)

## Detalhes tecnicos

- A mutacao `clearQueue` recebera o `campaignFilter` opcional para limpar apenas a fila de uma campanha especifica ou todas
- Para `call_queue`: usar `DELETE` com filtro `status = 'waiting'`
- Para `call_logs` ready: usar `UPDATE` para `call_status = 'cancelled'` (nao deletar logs para manter historico)
- O `AlertDialog` do shadcn/ui sera usado para a confirmacao, mantendo consistencia visual

