

## Plano: Duplicar Sequência por Completo

### Objetivo
Adicionar botão de duplicar em cada card de sequência, clonando a sequência (metadados + nós/steps internos) com o prefixo "Cópia de".

### Mudanças

**1. Props — `UnifiedSequenceList` e wrappers**

Adicionar prop opcional `onDuplicate?: (id: string) => Promise<void>` em:
- `UnifiedSequenceListProps<T>` (shared component)
- `SequenceListProps` (group wrapper)
- `DispatchSequenceListProps` (dispatch wrapper)

**2. UI — Botão duplicar no card**

No `UnifiedSequenceList.tsx`, adicionar ícone `Copy` ao lado dos botões Edit/Delete (linha 139-145), visível apenas se `onDuplicate` estiver definido.

**3. Hook `useSequences` — mutation `duplicateSequence`**

Nova mutation que:
1. Busca a sequência original (`message_sequences`)
2. Insere clone com nome "Cópia de {nome}", `active: false`
3. Busca todos os `sequence_nodes` da sequência original
4. Insere clones dos nós na nova sequência, mapeando IDs antigos → novos
5. Busca todos os `sequence_connections` da sequência original
6. Insere clones das conexões usando o mapeamento de IDs

**4. Hook `useDispatchSequences` — mutation `duplicateSequence`**

Nova mutation que:
1. Busca a sequência original (`dispatch_sequences`)
2. Insere clone com nome "Cópia de {nome}", `is_active: false`
3. Busca todos os `dispatch_sequence_steps` da sequência original
4. Insere clones dos steps na nova sequência

**5. Tabs `SequencesTab` (group e dispatch)**

Passar `onDuplicate` do hook para o componente de lista.

### Arquivos afetados

| Arquivo | Ação |
|---------|------|
| `src/components/sequences/UnifiedSequenceList.tsx` | Prop + botão Copy |
| `src/components/sequences/shared-types.ts` | Nenhuma mudança |
| `src/hooks/useSequences.ts` | Mutation duplicateSequence |
| `src/hooks/useDispatchSequences.ts` | Mutation duplicateSequence |
| `src/components/group-campaigns/sequences/SequenceList.tsx` | Passar onDuplicate |
| `src/components/dispatch-campaigns/sequences/DispatchSequenceList.tsx` | Passar onDuplicate |
| `src/components/group-campaigns/tabs/SequencesTab.tsx` | Conectar duplicateSequence |
| `src/components/dispatch-campaigns/tabs/SequencesTab.tsx` | Conectar duplicateSequence |

