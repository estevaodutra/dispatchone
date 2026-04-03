

## Plano: Adicionar seletor de lista no action "Adicionar a uma Lista"

### Problema
Quando o usuário seleciona a ação "Adicionar a uma Lista" no PollActionDialog e escolhe uma campanha, não aparece o dropdown para selecionar **qual lista de execução** daquela campanha o lead deve ser inserido. Como agora suportamos múltiplas listas por campanha, é necessário mostrar esse segundo seletor.

### Alteração

**`src/components/group-campaigns/sequences/PollActionDialog.tsx`**

1. Importar `useGroupExecutionList` para buscar as listas da campanha selecionada
2. No bloco `actionType === "add_to_list"`, após o select de "Campanha de destino":
   - Adicionar estado reativo: quando `config.campaignId` mudar, carregar as listas daquela campanha via `useGroupExecutionList(config.campaignId)`
   - Adicionar um segundo `Select` com label **"Lista de destino"** que lista todas as execution lists da campanha selecionada
   - Salvar `listId` e `listName` no config
   - Atualizar a descrição para "O participante será adicionado à lista selecionada"
3. Limpar `listId` quando a campanha mudar (para evitar referência stale)

### Arquivos
- `src/components/group-campaigns/sequences/PollActionDialog.tsx` — adicionar select de lista

