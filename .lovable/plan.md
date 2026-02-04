
# Plano: Implementar Modulo de Campanhas de Ligacao

## Visao Geral

Implementar um modulo completo para gerenciamento de campanhas de ligacoes telefonicas integradas com API4com. Operadores usam softphone externo e consultam o roteiro visual no DispatchOne durante as ligacoes.

---

## Arquitetura do Modulo

```text
/campaigns/telefonia/ligacao (lista de campanhas)
  └── /:id (detalhes com abas)
        ├── Configuracao
        ├── Operadores
        ├── Roteiro (editor visual)
        ├── Acoes
        ├── Leads
        └── Historico

/call/script/:campaignId/:leadId (tela do operador)
```

---

## Fase 1: Banco de Dados

### 1.1 Novas Tabelas

**call_campaigns** - Campanhas de ligacao

```sql
CREATE TABLE call_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft',
  api4com_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies for user isolation
ALTER TABLE call_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own call_campaigns" ON call_campaigns
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Index
CREATE INDEX idx_call_campaigns_user_status ON call_campaigns(user_id, status);
```

**call_campaign_operators** - Operadores atribuidos

```sql
CREATE TABLE call_campaign_operators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES call_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  profile_id UUID, -- referencia ao profiles para nome do operador
  extension TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, user_id)
);

ALTER TABLE call_campaign_operators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage operators via campaign" ON call_campaign_operators
  FOR ALL USING (
    EXISTS (SELECT 1 FROM call_campaigns WHERE id = campaign_id AND user_id = auth.uid())
  );
```

**call_scripts** - Roteiros visuais

```sql
CREATE TABLE call_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES call_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Roteiro Principal',
  nodes JSONB NOT NULL DEFAULT '[]',
  edges JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE call_scripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own call_scripts" ON call_scripts
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

**call_script_actions** - Acoes pos-ligacao

```sql
CREATE TABLE call_script_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES call_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#10b981',
  icon TEXT DEFAULT 'check',
  action_type TEXT NOT NULL,
  action_config JSONB DEFAULT '{}',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE call_script_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own call_script_actions" ON call_script_actions
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

**call_leads** - Leads para ligar

```sql
CREATE TABLE call_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES call_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  phone TEXT NOT NULL,
  name TEXT,
  email TEXT,
  custom_fields JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  attempts INT DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  result_action_id UUID REFERENCES call_script_actions(id),
  result_notes TEXT,
  assigned_operator_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE call_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own call_leads" ON call_leads
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_call_leads_campaign_status ON call_leads(campaign_id, status);
```

**call_logs** - Historico de ligacoes

```sql
CREATE TABLE call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES call_campaigns(id),
  lead_id UUID REFERENCES call_leads(id),
  operator_id UUID,
  user_id UUID NOT NULL,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INT,
  action_id UUID REFERENCES call_script_actions(id),
  notes TEXT,
  script_path JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own call_logs" ON call_logs
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_call_logs_campaign ON call_logs(campaign_id);
```

---

## Fase 2: Hooks React

### 2.1 useCallCampaigns.ts

Hook principal para CRUD de campanhas de ligacao.

```typescript
interface CallCampaign {
  id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'paused' | 'completed';
  api4comConfig: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

function useCallCampaigns() {
  // Lista campanhas
  // Cria campanha
  // Atualiza campanha
  // Deleta campanha
}
```

### 2.2 useCallOperators.ts

Gerenciamento de operadores de uma campanha.

```typescript
interface CallOperator {
  id: string;
  campaignId: string;
  userId: string;
  profileName?: string;
  extension: string | null;
  isActive: boolean;
}

function useCallOperators(campaignId: string) {
  // Lista operadores
  // Adiciona operador
  // Remove operador
  // Toggle ativo/inativo
}
```

### 2.3 useCallScript.ts

Gerenciamento do roteiro visual.

```typescript
interface CallScriptNode {
  id: string;
  type: 'start' | 'speech' | 'question' | 'note' | 'end';
  data: {
    text?: string;
    options?: string[];
  };
  position: { x: number; y: number };
}

interface CallScriptEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

function useCallScript(campaignId: string) {
  // Obtem roteiro
  // Salva roteiro (nodes + edges)
}
```

### 2.4 useCallActions.ts

Gerenciamento de acoes pos-ligacao.

```typescript
interface CallAction {
  id: string;
  campaignId: string;
  name: string;
  color: string;
  icon: string;
  actionType: 'start_sequence' | 'add_tag' | 'update_status' | 'webhook' | 'none';
  actionConfig: Record<string, unknown>;
  sortOrder: number;
}

function useCallActions(campaignId: string) {
  // Lista acoes
  // Cria acao
  // Atualiza acao
  // Deleta acao
  // Reordena
}
```

### 2.5 useCallLeads.ts

Gerenciamento de leads da campanha.

```typescript
interface CallLead {
  id: string;
  campaignId: string;
  phone: string;
  name: string | null;
  email: string | null;
  customFields: Record<string, unknown>;
  status: 'pending' | 'calling' | 'in_progress' | 'completed' | 'no_answer' | 'busy' | 'failed';
  attempts: number;
  resultAction?: CallAction;
  resultNotes: string | null;
}

function useCallLeads(campaignId: string) {
  // Lista leads com paginacao
  // Adiciona lead
  // Adiciona leads em lote
  // Atualiza lead
  // Completa ligacao
  // Stats (total, pending, completed, etc)
}
```

### 2.6 useCallLogs.ts

Historico de ligacoes.

```typescript
interface CallLog {
  id: string;
  campaignId: string;
  leadId: string;
  leadPhone: string;
  leadName?: string;
  operatorId: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  actionName?: string;
  notes?: string;
}

function useCallLogs(campaignId: string) {
  // Lista logs com filtros
  // Stats (total, duracao media, etc)
}
```

---

## Fase 3: Componentes de UI

### 3.1 Estrutura de Pastas

```text
src/components/call-campaigns/
├── CallCampaignList.tsx
├── CallCampaignDetails.tsx
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
├── script-builder/
│   ├── ScriptCanvas.tsx
│   ├── NodePalette.tsx
│   ├── ScriptNode.tsx
│   └── NodeConfigPanel.tsx
└── operator/
    ├── OperatorScriptView.tsx
    └── ActionButtons.tsx
```

### 3.2 CallCampaignList.tsx

Lista de campanhas seguindo padrao de GroupCampaignList:
- Grid de cards com nome, status, contagem de leads
- Busca por nome
- Menu de acoes (configurar, publicar, pausar, excluir)
- Botao "Nova Campanha"

### 3.3 CallCampaignDetails.tsx

Detalhes com 6 abas seguindo padrao de GroupCampaignDetails:
- Header com botao voltar e nome da campanha
- Tabs: Configuracao, Operadores, Roteiro, Acoes, Leads, Historico

### 3.4 ConfigTab.tsx

Formulario de configuracao:
- Nome da campanha
- Descricao
- Status (select)
- Configuracao API4com (ID da fila, opcional)

### 3.5 OperatorsTab.tsx

Gerenciamento de operadores:
- Lista de operadores com nome, ramal, status
- Toggle ativo/inativo
- Botao adicionar
- Dialog para adicionar (select usuario + input ramal)

### 3.6 ScriptTab.tsx (Editor Visual)

Editor de roteiro baseado em drag-and-drop:

**Componentes do roteiro:**
| Tipo | Icone | Cor | Descricao |
|------|-------|-----|-----------|
| start | Circle | Verde | Ponto inicial |
| speech | MessageSquare | Azul | Texto para falar |
| question | HelpCircle | Roxo | Pergunta com opcoes |
| note | StickyNote | Amarelo | Nota interna |
| end | XCircle | Vermelho | Fim do fluxo |

**Estrutura do Canvas:**
- Painel esquerdo: paleta de componentes
- Area central: canvas com nodes arrastáveis
- Painel direito: configuracao do node selecionado (aparece ao clicar)

**Interacoes:**
- Arrastar componente da paleta para canvas
- Clicar em node para editar texto/opcoes
- Conectar nodes (source -> target)
- Para questions: cada opcao cria uma conexao com label

### 3.7 ActionsTab.tsx

Gerenciamento de acoes pos-ligacao:
- Lista de acoes com cor, nome, tipo
- Drag para reordenar
- Botoes editar/excluir
- Dialog para criar/editar acao

**Tipos de acao disponiveis:**
| Tipo | Config | Descricao |
|------|--------|-----------|
| start_sequence | campaignId, sequenceId | Dispara sequencia WhatsApp |
| add_tag | tags[] | Adiciona tags ao lead |
| update_status | newStatus | Muda status do lead |
| webhook | url, method, body | Dispara POST externo |
| none | - | Apenas registra resultado |

### 3.8 LeadsTab.tsx

Gerenciamento de leads:
- Cards de stats (total, pendentes, em andamento, concluidos)
- Tabela com telefone, nome, status, resultado, tentativas
- Filtros por status e operador
- Importar CSV / Exportar
- Dialog para adicionar lead manual

### 3.9 HistoryTab.tsx

Historico de ligacoes:
- Tabela com lead, operador, duracao, resultado, data
- Filtros por data, operador, acao
- Exportar logs

---

## Fase 4: Tela do Operador

### 4.1 Rota

```typescript
// Em App.tsx
<Route path="/call/script/:campaignId/:leadId" element={<OperatorScriptView />} />
```

### 4.2 OperatorScriptView.tsx

Tela simplificada para operador conduzir ligacao:

**Estrutura:**
- Header: dados do lead (nome, telefone)
- Corpo: card com instrucao atual (fala ou pergunta)
- Se pergunta: botoes com opcoes de resposta
- Se fala: botao "Proximo"
- Area de anotacoes
- Footer: botoes de acao para finalizar

**Fluxo:**
1. Operador abre tela com lead especifico
2. Sistema carrega roteiro e posiciona no node inicial
3. Operador segue instrucoes e clica nas opcoes
4. Sistema navega entre nodes conforme edges
5. Ao finalizar, operador clica em uma acao
6. Sistema registra log e executa acao configurada

### 4.3 Substituicao de Variaveis

Variaveis suportadas no texto do roteiro:
- `{nome}` - Nome do lead
- `{telefone}` - Telefone do lead
- `{operador}` - Nome do operador
- `{campo_custom}` - Campos personalizados do lead

---

## Fase 5: Edge Functions (API)

### 5.1 call-campaigns-api

Endpoint para importar leads via API externa.

**Rota:** POST /call-campaigns-api/leads

```typescript
// supabase/functions/call-campaigns-api/index.ts

// Autenticacao via API key
// Validar campaign_id pertence ao usuario
// Inserir leads em lote
// Retornar IDs criados
```

### 5.2 complete-call

Endpoint para finalizar ligacao.

**Rota:** POST /complete-call

```typescript
// Recebe: leadId, actionId, notes, scriptPath, durationSeconds
// Atualiza call_leads com resultado
// Insere em call_logs
// Executa acao configurada (start_sequence, webhook, etc)
```

---

## Fase 6: Pagina Principal

### 6.1 Atualizar CallCampaigns.tsx

Substituir placeholder atual por pagina funcional:

```typescript
// src/pages/campaigns/CallCampaigns.tsx

export default function CallCampaigns() {
  const [selectedCampaign, setSelectedCampaign] = useState<CallCampaign | null>(null);
  const { campaigns, isLoading, createCampaign, updateCampaign, deleteCampaign } = useCallCampaigns();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  if (selectedCampaign) {
    return (
      <CallCampaignDetails
        campaign={selectedCampaign}
        onBack={() => setSelectedCampaign(null)}
        onUpdate={updateCampaign}
      />
    );
  }

  return (
    <>
      <CampaignBreadcrumb channel="telefonia" type="Ligacao" />
      <CallCampaignList
        campaigns={campaigns}
        isLoading={isLoading}
        onSelect={setSelectedCampaign}
        onDelete={deleteCampaign}
        onStatusChange={(id, status) => updateCampaign({ id, updates: { status } })}
        onCreateNew={() => setShowCreateDialog(true)}
      />
      <CreateCampaignDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreate={createCampaign}
      />
    </>
  );
}
```

---

## Resumo de Arquivos

### Banco de Dados (1 migracao)

| Tabela | Campos Principais |
|--------|-------------------|
| call_campaigns | id, name, status, api4com_config |
| call_campaign_operators | id, campaign_id, profile_id, extension |
| call_scripts | id, campaign_id, nodes, edges |
| call_script_actions | id, campaign_id, name, action_type, action_config |
| call_leads | id, campaign_id, phone, status, result_action_id |
| call_logs | id, campaign_id, lead_id, duration_seconds, action_id |

### Hooks (6 novos)

| Arquivo | Funcao |
|---------|--------|
| useCallCampaigns.ts | CRUD campanhas |
| useCallOperators.ts | Gerenciar operadores |
| useCallScript.ts | Salvar/carregar roteiro |
| useCallActions.ts | CRUD acoes |
| useCallLeads.ts | CRUD leads + stats |
| useCallLogs.ts | Listar historico |

### Componentes (~20 novos)

| Categoria | Componentes |
|-----------|-------------|
| Lista | CallCampaignList |
| Detalhes | CallCampaignDetails |
| Tabs | ConfigTab, OperatorsTab, ScriptTab, ActionsTab, LeadsTab, HistoryTab |
| Dialogs | CreateCampaignDialog, AddOperatorDialog, AddLeadDialog, ConfigureActionDialog |
| Script | ScriptCanvas, NodePalette, ScriptNode, NodeConfigPanel |
| Operador | OperatorScriptView, ActionButtons |

### Edge Functions (2 novas)

| Funcao | Proposito |
|--------|-----------|
| call-campaigns-api | API para importar leads |
| complete-call | Finalizar ligacao e executar acao |

### Rotas (2 novas)

| Rota | Componente |
|------|------------|
| /campaigns/telefonia/ligacao/:id | CallCampaignDetails (via state) |
| /call/script/:campaignId/:leadId | OperatorScriptView |

---

## Ordem de Implementacao

1. **Migracao SQL** - Criar todas as tabelas
2. **Hooks** - useCallCampaigns, useCallLeads, useCallActions, useCallScript
3. **Lista e Detalhes** - CallCampaignList, CallCampaignDetails basicos
4. **ConfigTab e OperatorsTab** - Tabs mais simples primeiro
5. **ActionsTab** - CRUD de acoes
6. **LeadsTab** - Gerenciamento de leads
7. **ScriptTab** - Editor visual de roteiro
8. **OperatorScriptView** - Tela do operador
9. **HistoryTab** - Logs de ligacoes
10. **Edge Functions** - APIs externas
11. **Testes** - Validar fluxo completo

---

## Consideracoes Tecnicas

### Editor de Roteiro
- Usar abordagem similar ao SequenceBuilder existente (drag-and-drop com lista ordenada)
- Nodes conectados por edges com labels para opcoes de resposta
- JSON simples armazenado em JSONB (sem React Flow por enquanto)

### Operadores
- Referenciar tabela `profiles` para obter nome do operador
- Permitir usuarios do sistema ou entrada manual de nome

### Acoes pos-ligacao
- Reutilizar logica do trigger-sequence para disparar sequencias
- Webhook usa mesmo padrao das sequences existentes

### Seguranca
- Todas tabelas com RLS por user_id
- Tela do operador valida se usuario e operador da campanha
- API de leads autenticada por API key
