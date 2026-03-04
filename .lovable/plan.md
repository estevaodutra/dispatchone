

## Adicionar/Remover Leads em Massa da Fila

### Escopo

Três novas funcionalidades na aba Fila do Painel de Ligações:

1. **Botão "Remover da Fila"** — modal com filtros (campanha, tentativas, tags) + prévia + confirmação especial para prioritários
2. **Botão "Limpar Tudo"** — modal com detalhamento por campanha + confirmação digitando "LIMPAR TUDO"
3. **Melhorar o "Adicionar à Fila" existente** — o `CreateQueueDialog` já existe e já faz a maior parte do que o spec pede; manter como está

### Plano de Implementação

#### 1. Migração SQL — 3 funções

- `queue_remove_preview(p_company_id, p_campaign_ids[], p_attempt_filter)` — retorna contagens e breakdown por campanha (prioritárias vs normais)
- `queue_remove_bulk(p_company_id, p_campaign_ids[], p_attempt_filter)` — deleta itens filtrados da `call_queue`, retorna contagens
- `queue_clear_all_preview(p_company_id)` — retorna breakdown total para o modal "Limpar Tudo"

As funções serão `SECURITY DEFINER` com `search_path = public`.

Filtros simplificados vs spec: tags e last_statuses são complexos de implementar na `call_queue` pois ela não guarda tags diretamente. Os filtros práticos serão: **campanha** e **tentativas** (1ª, retry, última).

#### 2. Novo componente: `RemoveFromQueueDialog`

Arquivo: `src/components/call-panel/RemoveFromQueueDialog.tsx`

- Seleção de campanhas (checkbox list com ⚡ para prioritárias, contagem "na fila")
- Filtro por tentativas (qualquer / 1ª / retry / última)
- Prévia em tempo real chamando `queue_remove_preview` via RPC
- Botão "Remover X Leads"
- Se houver prioritários na seleção → abre sub-dialog pedindo digitar "REMOVER"
- Executa `queue_remove_bulk` via RPC + invalida queries

#### 3. Novo componente: `ClearAllQueueDialog`

Arquivo: `src/components/call-panel/ClearAllQueueDialog.tsx`

- Mostra breakdown por campanha (prioritárias, normais, agendados)
- Exige digitar "LIMPAR TUDO" para confirmar
- Executa delete em `call_queue` + cancela `call_logs` scheduled/ready (lógica existente)

#### 4. Atualizar `CallPanel.tsx`

- Substituir o `AlertDialog` simples do "Limpar Fila" pelo novo `ClearAllQueueDialog`
- Adicionar botão "Remover da Fila" ao lado do "Adicionar à Fila"
- Importar os dois novos componentes

### Resumo de Arquivos

| Arquivo | Ação |
|---------|------|
| Migração SQL | `queue_remove_preview` + `queue_remove_bulk` + `queue_clear_all_preview` |
| `src/components/call-panel/RemoveFromQueueDialog.tsx` | Novo |
| `src/components/call-panel/ClearAllQueueDialog.tsx` | Novo |
| `src/pages/CallPanel.tsx` | Adicionar botão + importar novos dialogs + remover AlertDialog antigo |

