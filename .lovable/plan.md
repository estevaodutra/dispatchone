

# Corrigir parsing da resposta do webhook de membros

## Problema

A resposta do webhook retorna um array de objetos, onde cada objeto representa um grupo e contem um campo `participants` com a lista de membros. O codigo atual tenta acessar `data.members` ou `data.participants` diretamente, mas como `data` e um array, essas propriedades sao `undefined` e o fallback `data` retorna o array de grupos em vez dos participantes.

Formato real da resposta:
```text
[
  {
    "phone": "120363319799859760-group",
    "subject": "Nome do Grupo",
    "participants": [
      { "phone": "5511999999999", "isAdmin": false, "isSuperAdmin": false },
      ...
    ]
  }
]
```

## Solucao

Atualizar a logica de parsing em dois arquivos para:
1. Verificar se `data` e um array
2. Se for, extrair `participants` do primeiro elemento (ou iterar todos)
3. Filtrar phones que contem "-group" (sao JIDs de grupo, nao membros)
4. Mapear `isSuperAdmin` como admin tambem

## Arquivos modificados

### 1. `src/components/group-campaigns/tabs/MembersTab.tsx`

Na funcao `handleFetchMembers` (linhas 117-130), substituir a logica de parsing:

```text
-- DE:
const rawMembers = data.members || data.participants || data || [];
const membersList = Array.isArray(rawMembers) ? rawMembers : [];

-- PARA:
// Resposta e um array de objetos de grupo, cada um com "participants"
let membersList: any[] = [];
if (Array.isArray(data)) {
  for (const item of data) {
    if (item.participants && Array.isArray(item.participants)) {
      membersList.push(...item.participants);
    }
  }
} else if (data.participants) {
  membersList = data.participants;
} else if (data.members) {
  membersList = data.members;
}
```

Tambem atualizar o mapeamento para filtrar JIDs de grupo e incluir `isSuperAdmin`:

```text
const membersToInsert = membersList
  .filter(m => m.phone && !m.phone.includes("-group"))
  .map(m => ({
    phone: m.phone,
    name: m.name || undefined,
    isAdmin: m.isAdmin || m.isSuperAdmin || false,
  }));
```

### 2. `src/components/group-campaigns/tabs/GroupsListTab.tsx`

Na funcao `fetchAndImportMembers` (linhas 172-181), aplicar a mesma correcao de parsing com a mesma logica acima.

