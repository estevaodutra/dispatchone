

## Plano: Visualização de Logs por Nó com Reprocessamento

### O que será adicionado

Nova opção **"Ver logs"** no menu de cada card de mensagem (ao lado de Editar / Duplicar / Pausar / Executar agora / Excluir) dentro do construtor de sequência. Ao clicar, abre um diálogo lateral mostrando o histórico detalhado de envios daquele nó com possibilidade de reprocessar.

### UI: novo diálogo `NodeLogsDialog`

Aberto pelo card, escopado ao nó (`sequenceId` + `nodeOrder`). Mostra os últimos 50 envios das últimas 72h (filtro de retenção atual da tabela `group_message_logs`).

Cada linha exibe:
- Status (badge: ✓ Enviado / ⚠️ Pendente / ✗ Erro)
- Destino (`group_name` ou `recipient_phone`)
- Instância usada
- Timestamp (`sent_at`)
- Tempo de resposta (ms)
- Mensagem de erro, se houver

Clicando na linha, expande detalhes em accordion:
- **Payload enviado** (`payload` em JSON formatado, com botão copiar)
- **Resposta do provedor** (`provider_response` em JSON formatado, com botão copiar)
- **IDs externos** (`external_message_id`, `zaap_id`)

Ações por linha:
- **Reprocessar este envio** → chama `execute-message` com `sequenceId`, `manualNodeIndex=nodeOrder`, e — se o log foi de envio privado (`recipient_phone` preenchido) — `targetPhones=[recipient_phone]`. Se foi para grupo, reprocessa para todos os grupos vinculados.
- **Copiar payload** / **Copiar resposta**

Ação no header do diálogo:
- **Reprocessar nó inteiro** (atalho equivalente a "Executar agora", já existente, mas oferecido aqui também)
- **Atualizar** (refetch manual)

Cabeçalho mostra contadores: `X enviados · Y com erro · Z pendentes` no escopo das últimas 72h.

### Hook novo: `useNodeLogs(sequenceId, nodeOrder)`

- Query React Query, key `["node-logs", sequenceId, nodeOrder]`
- Seleciona de `group_message_logs` filtrando por `sequence_id` e `node_order`, ordem `sent_at desc`, limite 50
- Refetch a cada 10s (igual ao `useSequenceLogs` atual) + invalidação via Realtime quando uma row da tabela muda
- Retorna logs tipados incluindo `payload`, `providerResponse`, `externalMessageId`, `zaapId`, `recipientPhone`, `groupName`, etc.

### Mutation nova: `useReprocessLog`

- Recebe um `SequenceLog` + `sequenceId` + `nodeOrder`
- Invoca `supabase.functions.invoke("execute-message", { body })` com:
  - `campaignId` (do log)
  - `sequenceId`
  - `manualNodeIndex: nodeOrder`
  - Se `recipientPhone` está setado → `targetPhones: [recipientPhone]` (retry privado para aquele destinatário específico)
- Toast de sucesso/erro e invalidação de `["node-logs", ...]` e `["sequence-logs"]`

### Integração no card

`MessageCard.tsx` ganha:
- Nova prop opcional `onViewLogs?: () => void`
- Novo `DropdownMenuItem` "Ver logs" com ícone `History` (lucide), posicionado entre "Executar agora" e o separador

`MessageTimeline.tsx` ganha prop `onViewLogsNode?: (node) => void` e propaga para os cards.

`TimelineSequenceBuilder.tsx`:
- Estado `viewingLogsNode: LocalNode | null`
- Renderiza `<NodeLogsDialog node={viewingLogsNode} sequenceId={sequence.id} campaignId={sequence.groupCampaignId} onClose={...} />` quando setado
- Passa `onViewLogsNode={(node) => setViewingLogsNode(node)}` para `MessageTimeline`

### Backend

Nenhuma mudança. `execute-message` já:
- Aceita `manualNodeIndex` para executar um único nó
- Aceita `targetPhones` para direcionar a destinatários privados específicos
- Persiste `payload`, `provider_response`, `error_message`, `response_time_ms` em `group_message_logs`

### Arquivos afetados

- `src/components/group-campaigns/sequences/NodeLogsDialog.tsx` — **novo**
- `src/hooks/useNodeLogs.ts` — **novo**
- `src/components/group-campaigns/sequences/MessageCard.tsx` — adicionar item "Ver logs"
- `src/components/group-campaigns/sequences/MessageTimeline.tsx` — propagar prop
- `src/components/group-campaigns/sequences/TimelineSequenceBuilder.tsx` — montar diálogo

### Comportamento final

1. Usuário abre o menu `...` de um card → clica **"Ver logs"**
2. Diálogo lateral abre listando os últimos envios daquele nó com status, destino, hora e tempo de resposta
3. Expande linha → vê payload + resposta crua do n8n/Z-API
4. Clica **"Reprocessar"** numa linha com erro → o nó é re-executado para aquele destinatário específico → toast confirma → lista atualiza via Realtime mostrando o novo envio

### Fora do escopo

- Paginação além de 50 (retenção é 72h e o volume por nó é baixo)
- Reprocessamento em lote de várias linhas selecionadas (pode vir depois se útil)
- Edição do payload antes de reprocessar

