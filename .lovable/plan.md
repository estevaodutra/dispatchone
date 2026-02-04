
# Implementacao do Modulo de Campanhas de Ligacao - Fase 2

Com a migracao do banco de dados aprovada, vou implementar os hooks React e componentes de UI seguindo os padroes existentes do projeto.

---

## Proximos Passos de Implementacao

### Fase 2: Hooks React (6 novos)

Criar hooks seguindo o padrao de `useGroupCampaigns.ts`:

#### 2.1 src/hooks/useCallCampaigns.ts

```typescript
// CRUD de campanhas de ligacao
// - Lista campanhas do usuario
// - Cria nova campanha
// - Atualiza campanha
// - Deleta campanha
// Seguir padrao de useGroupCampaigns
```

#### 2.2 src/hooks/useCallOperators.ts

```typescript
// Gerenciamento de operadores por campanha
// - Lista operadores da campanha
// - Adiciona operador
// - Remove operador  
// - Toggle ativo/inativo
```

#### 2.3 src/hooks/useCallScript.ts

```typescript
// Gerenciamento do roteiro visual
// - Obtem roteiro da campanha
// - Salva roteiro (nodes + edges)
// - Cria roteiro inicial se nao existir
```

#### 2.4 src/hooks/useCallActions.ts

```typescript
// CRUD de acoes pos-ligacao
// - Lista acoes da campanha
// - Cria acao
// - Atualiza acao
// - Deleta acao
// - Reordena acoes
```

#### 2.5 src/hooks/useCallLeads.ts

```typescript
// Gerenciamento de leads
// - Lista leads com paginacao
// - Adiciona lead
// - Adiciona leads em lote
// - Atualiza lead
// - Completa ligacao (muda status + registra resultado)
// - Stats (total, pending, completed, etc)
```

#### 2.6 src/hooks/useCallLogs.ts

```typescript
// Historico de ligacoes
// - Lista logs com filtros
// - Stats (total, duracao media, etc)
```

---

### Fase 3: Componentes de UI

#### Estrutura de Pastas

```text
src/components/call-campaigns/
├── CallCampaignList.tsx
├── CallCampaignDetails.tsx
├── index.ts
├── dialogs/
│   ├── CreateCampaignDialog.tsx
│   ├── AddOperatorDialog.tsx
│   ├── AddLeadDialog.tsx
│   └── ConfigureActionDialog.tsx
├── tabs/
│   ├── ConfigTab.tsx
│   ├── OperatorsTab.tsx
│   ├── ScriptTab.tsx
│   ├── ActionsTab.tsx
│   ├── LeadsTab.tsx
│   └── HistoryTab.tsx
└── script-builder/
    ├── ScriptCanvas.tsx
    ├── NodePalette.tsx
    ├── ScriptNode.tsx
    └── NodeConfigPanel.tsx
```

#### 3.1 CallCampaignList.tsx

Seguir padrao de GroupCampaignList:
- Grid de cards com nome, status, contagem de leads
- Busca por nome
- Menu de acoes (configurar, publicar, pausar, excluir)
- Botao "Nova Campanha"

#### 3.2 CallCampaignDetails.tsx

Seguir padrao de GroupCampaignDetails:
- Header com botao voltar e nome
- 6 abas: Configuracao, Operadores, Roteiro, Acoes, Leads, Historico

#### 3.3 ConfigTab.tsx

Formulario simples:
- Nome da campanha
- Descricao
- Status (select: draft, active, paused, completed)
- Configuracao API4com (ID da fila, opcional)

#### 3.4 OperatorsTab.tsx

- Lista de operadores com nome, ramal, status
- Toggle ativo/inativo
- Botao adicionar abre AddOperatorDialog
- AddOperatorDialog: nome do operador + ramal

#### 3.5 ScriptTab.tsx (Editor Visual)

Editor baseado em lista ordenada (similar ao SequenceBuilder):
- Paleta de componentes: Inicio, Fala, Pergunta, Nota, Fim
- Canvas com nodes arrastáveis em lista vertical
- Painel de configuracao ao clicar em node
- Conexoes automaticas entre nodes adjacentes
- Para perguntas: opcoes de resposta com labels

#### 3.6 ActionsTab.tsx

- Lista de acoes com cor, nome, tipo
- Botoes editar/excluir
- ConfigureActionDialog para criar/editar
- Tipos: start_sequence, add_tag, update_status, webhook, none

#### 3.7 LeadsTab.tsx

- Cards de stats (total, pendentes, em andamento, concluidos)
- Tabela com telefone, nome, status, resultado, tentativas
- Filtros por status
- AddLeadDialog para adicionar lead manual

#### 3.8 HistoryTab.tsx

- Tabela com lead, operador, duracao, resultado, data
- Filtros por data e acao

---

### Fase 4: Atualizar Pagina Principal

#### 4.1 src/pages/campaigns/CallCampaigns.tsx

Substituir placeholder atual por pagina funcional que:
- Usa useCallCampaigns para CRUD
- Renderiza CallCampaignList ou CallCampaignDetails
- Inclui CreateCampaignDialog

---

### Fase 5: Tela do Operador

#### 5.1 Rota em App.tsx

```typescript
<Route path="/call/script/:campaignId/:leadId" element={<OperatorScriptView />} />
```

#### 5.2 src/components/call-campaigns/operator/OperatorScriptView.tsx

Tela simplificada para operador:
- Header: dados do lead (nome, telefone)
- Corpo: card com instrucao atual (fala ou pergunta)
- Se pergunta: botoes com opcoes de resposta
- Se fala: botao "Proximo"
- Area de anotacoes
- Footer: botoes de acao para finalizar

---

## Ordem de Implementacao

1. **Hooks** - useCallCampaigns, useCallLeads, useCallActions, useCallScript, useCallOperators, useCallLogs
2. **Lista e Detalhes** - CallCampaignList, CallCampaignDetails, CreateCampaignDialog
3. **ConfigTab e OperatorsTab** - Tabs mais simples primeiro
4. **ActionsTab** - CRUD de acoes
5. **LeadsTab** - Gerenciamento de leads
6. **ScriptTab** - Editor visual de roteiro
7. **HistoryTab** - Logs de ligacoes
8. **OperatorScriptView** - Tela do operador
9. **Atualizar CallCampaigns.tsx** - Pagina principal funcional

---

## Arquivos a Criar

| Categoria | Arquivo |
|-----------|---------|
| Hooks | useCallCampaigns.ts, useCallOperators.ts, useCallScript.ts, useCallActions.ts, useCallLeads.ts, useCallLogs.ts |
| Componentes | CallCampaignList.tsx, CallCampaignDetails.tsx, index.ts |
| Dialogs | CreateCampaignDialog.tsx, AddOperatorDialog.tsx, AddLeadDialog.tsx, ConfigureActionDialog.tsx |
| Tabs | ConfigTab.tsx, OperatorsTab.tsx, ScriptTab.tsx, ActionsTab.tsx, LeadsTab.tsx, HistoryTab.tsx |
| Script Builder | ScriptCanvas.tsx, NodePalette.tsx, ScriptNode.tsx, NodeConfigPanel.tsx |
| Operador | OperatorScriptView.tsx, ActionButtons.tsx |

**Total: ~20 novos arquivos**
