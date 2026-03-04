

## Adicionar "Ver Detalhes" e "Ligar a Seguir" em todas as abas

### Problema
Atualmente, apenas a aba **Fila** tem o botão de olho (Eye) para ver detalhes via `CallActionDialog`. As abas **Em Andamento**, **Atendidas** e **Histórico** não possuem essas opções. O usuário quer que todas as abas tenham:
1. Botão para ver detalhes (abre `CallActionDialog`)
2. Opção "Ligar a Seguir" que enfileira o lead para ser discado em seguida

### Implementação

**Arquivo: `src/pages/CallPanel.tsx`**

**1. Estado para controlar o lead selecionado para detalhes (já existe `viewingQueueLead`)**
- Reaproveitar o estado `viewingQueueLead` para todas as abas, passando os dados do entry com a estrutura esperada pelo `CallActionDialog`

**2. Função "Ligar a Seguir"**
- Criar uma função `handleCallNext(entry)` que:
  - Insere o lead no topo da `call_queue` (position 0) usando `callQueue.addToQueue` ou diretamente via Supabase insert com position = 0
  - Mostra toast "Lead adicionado ao topo da fila"
  - O queue-processor cuida de discar quando houver operador disponível

**3. Aba Em Andamento (cards, linhas ~1216-1256)**
- Adicionar botão Eye no card para abrir `CallActionDialog` com dados do `CallPanelEntry`
- Adicionar botão "Ligar a Seguir" (ícone Phone + texto) no card

**4. Aba Atendidas (tabela, linhas ~1274-1333)**
- Adicionar coluna "Ações" na tabela com:
  - Botão Eye → abre `CallActionDialog`
  - Botão "Ligar a Seguir" (ícone Phone)

**5. Aba Histórico (tabela, linhas ~1344-1395)**
- Adicionar coluna "Ações" na tabela com:
  - Botão Eye → abre `CallActionDialog`  
  - Botão "Ligar a Seguir" (ícone Phone)

**6. Função `handleDialNext`**
- Busca o `call_lead` pelo `leadId` + `campaignId`
- Insere na `call_queue` com `position: 0` (topo), `status: 'waiting'`, dados do lead
- Toast de confirmação
- Invalida queries da fila

### Resumo visual
Todas as 4 abas terão consistentemente: botão 👁️ (detalhes) e botão 📞 (ligar a seguir) por linha/card.

