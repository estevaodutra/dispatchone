
# Unificar Componentes do Construtor de Sequencias

## Problema

Existem dois conjuntos de componentes quase identicos para construir sequencias:

**Grupo (group-campaigns/sequences/):**
- SequenceList.tsx (263 linhas)
- SequenceBuilder.tsx (585 linhas)
- NodeConfigPanel.tsx (1024 linhas) -- mais completo
- TriggerConfigCard.tsx (441 linhas) -- mais completo

**Disparo (dispatch-campaigns/sequences/):**
- DispatchSequenceList.tsx (199 linhas)
- DispatchSequenceBuilder.tsx (512 linhas)
- DispatchNodeConfigPanel.tsx (284 linhas) -- versao simplificada
- DispatchTriggerConfigCard.tsx (174 linhas) -- versao simplificada

Os dois conjuntos compartilham ~80% do codigo (layout 3 paineis, drag-and-drop, paleta de componentes, canvas). A diferenca esta em:
- Tipos de nodes disponiveis (Grupo tem mais: sticker, poll, location, contact, event, condition, notify, webhook)
- Tipos de gatilhos (Grupo: member_join/leave, scheduled, keyword, webhook, manual / Disparo: manual, scheduled, api, on_add, action)
- Schema de persistencia (Grupo usa message_sequences + sequence_nodes / Disparo usa dispatch_sequences + dispatch_steps)
- NodeConfigPanel do Grupo tem MediaUploader e PollActionDialog

## Solucao

Criar componentes compartilhados em `src/components/sequences/` que aceitam configuracao via props para suportar ambos os contextos. Os wrappers em cada campanha delegam para esses componentes unificados.

### Novos Arquivos (src/components/sequences/)

#### 1. `src/components/sequences/UnifiedSequenceList.tsx`
Componente unificado para listar sequencias. Recebe via props:
- `sequences` -- array generico com campos comuns (id, name, description, triggerType, active/isActive)
- `triggerTypes` -- array de tipos de gatilho disponiveis
- `activeField` -- nome do campo de ativo ("active" ou "isActive")
- `triggerSelectorType` -- "select" (grupo) ou "radio" (disparo)
- Callbacks: `onCreate`, `onEdit`, `onDelete`, `onToggleActive`

Estrutura visual: a mesma grid de cards que ambos ja usam.

#### 2. `src/components/sequences/UnifiedSequenceBuilder.tsx`
Componente unificado do builder de 3 paineis. Recebe via props:
- `nodeCategories` -- categorias e nodes disponiveis (cada contexto define os seus)
- `activeField` -- "active" ou "isActive"
- `triggerComponent` -- o componente de trigger a renderizar (TriggerConfigCard ou DispatchTriggerConfigCard)
- `configPanelComponent` -- o componente de config a renderizar
- `onSave` -- callback customizado de persistencia (cada contexto implementa a logica de salvar no seu schema)

Toda a logica compartilhada fica aqui: drag-and-drop, reordenacao, duplicacao, delecao, estado local de nodes, header com nome/ativar/salvar.

#### 3. `src/components/sequences/UnifiedNodeConfigPanel.tsx`
Componente unificado do painel de configuracao. Recebe via props:
- `mode` -- "group" ou "dispatch" para controlar quais campos exibir
- No modo "group": mostra todos os tipos (sticker, poll, location, contact, event, condition, notify, webhook) com MediaUploader e PollActionDialog
- No modo "dispatch": mostra apenas os tipos basicos (message, image, video, audio, document, buttons, list, delay) com input de URL simples e previa de mensagem

#### 4. `src/components/sequences/shared-types.ts`
Tipos compartilhados: `LocalNode`, `LocalConnection`, `NodeCategory`, `NodeTypeInfo`.

### Arquivos Modificados (wrappers finos)

#### 5. `src/components/group-campaigns/sequences/SequenceList.tsx`
Substituir por wrapper que importa `UnifiedSequenceList` e passa os trigger types de grupo e `activeField="active"`.

#### 6. `src/components/dispatch-campaigns/sequences/DispatchSequenceList.tsx`
Substituir por wrapper que importa `UnifiedSequenceList` e passa os trigger types de disparo e `activeField="isActive"`.

#### 7. `src/components/group-campaigns/sequences/SequenceBuilder.tsx`
Substituir por wrapper que importa `UnifiedSequenceBuilder`, passa os node categories completos de grupo, o TriggerConfigCard, o NodeConfigPanel no modo "group", e a logica de persistencia via `useSequenceNodes`.

#### 8. `src/components/dispatch-campaigns/sequences/DispatchSequenceBuilder.tsx`
Substituir por wrapper que importa `UnifiedSequenceBuilder`, passa os node categories de disparo, o DispatchTriggerConfigCard, o NodeConfigPanel no modo "dispatch", e a logica de persistencia via `useDispatchSteps` (com conversao stepsToNodes/nodesToSteps).

### Arquivos Preservados (sem alteracao)

- `TriggerConfigCard.tsx` -- trigger de grupo (funcionalidade especifica demais para unificar: dias da semana, keyword matching, webhook field mappings)
- `DispatchTriggerConfigCard.tsx` -- trigger de disparo (funcionalidade diferente: date/time picker, API URL)
- `MediaUploader.tsx`, `PollActionDialog.tsx`, `WebhookFieldMappings.tsx` -- componentes auxiliares de grupo
- Tabs de ambas as campanhas (SequencesTab) -- nenhuma alteracao necessaria pois a interface dos wrappers permanece identica
- Hooks (`useSequences`, `useSequenceNodes`, `useDispatchSequences`, `useDispatchSteps`) -- permanecem separados

## Detalhes Tecnicos

### Estrutura de pastas final

```text
src/components/sequences/
  shared-types.ts
  UnifiedSequenceList.tsx
  UnifiedSequenceBuilder.tsx
  UnifiedNodeConfigPanel.tsx
  index.ts

src/components/group-campaigns/sequences/
  SequenceList.tsx          (wrapper fino ~30 linhas)
  SequenceBuilder.tsx       (wrapper fino ~80 linhas)
  NodeConfigPanel.tsx       (REMOVIDO, migrado para UnifiedNodeConfigPanel)
  TriggerConfigCard.tsx     (mantido)
  MediaUploader.tsx         (mantido)
  PollActionDialog.tsx      (mantido)
  WebhookFieldMappings.tsx  (mantido)

src/components/dispatch-campaigns/sequences/
  DispatchSequenceList.tsx   (wrapper fino ~30 linhas)
  DispatchSequenceBuilder.tsx (wrapper fino ~80 linhas)
  DispatchNodeConfigPanel.tsx (REMOVIDO, migrado para UnifiedNodeConfigPanel)
  DispatchTriggerConfigCard.tsx (mantido)
```

### Interface do UnifiedSequenceBuilder

```typescript
interface UnifiedSequenceBuilderProps {
  // Dados da sequencia
  sequenceName: string;
  isActive: boolean;
  sequenceId: string;

  // Configuracao de nodes
  nodeCategories: NodeCategory[];
  getDefaultConfig: (nodeType: string) => Record<string, unknown>;
  getNodePreview: (node: LocalNode) => string;

  // Componentes customizaveis
  renderTrigger: () => React.ReactNode;
  renderConfigPanel: (node: LocalNode, onUpdate: ..., onClose: ...) => React.ReactNode;

  // Callbacks
  onSave: (name: string, nodes: LocalNode[], connections: LocalConnection[]) => Promise<void>;
  onToggleActive: () => Promise<void>;
  onBack: () => void;

  // Estado
  initialNodes: LocalNode[];
  initialConnections: LocalConnection[];
  isSaving: boolean;
}
```

### Beneficios

1. **Reducao de ~1500 linhas duplicadas** -- o codigo compartilhado (drag-and-drop, reordenacao, layout 3 paineis) existe em um unico lugar
2. **Consistencia visual** -- qualquer melhoria no builder se aplica automaticamente a ambos os contextos
3. **Extensibilidade** -- para adicionar um novo tipo de campanha com sequencias, basta criar um wrapper fino
4. **Sem breaking changes** -- as interfaces externas (SequencesTab) permanecem identicas
