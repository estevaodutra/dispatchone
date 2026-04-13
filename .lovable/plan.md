

## Plano: Filtros, Seleção e Execução de Sequência/Lista na Aba Membros

### Resumo
Adicionar filtro de período, checkboxes de seleção em massa, e ações de "Executar Sequência" e "Executar Lista" (mensagem individual) para membros selecionados. A execução envia mensagens privadas para os telefones dos membros selecionados usando a edge function `execute-message`.

### Alterações

---

**1. `src/components/group-campaigns/tabs/MembersTab.tsx`**

- Adicionar estado: `selectedIds: Set<string>`, `periodFilter: number | null`, `showExecuteSequenceDialog`, `showExecuteListDialog`
- Filtro de período: filtrar `filteredMembers` por `joinedAt` (últimos 7/14/30 dias ou todos)
- Renderizar barra de filtros com `PeriodFilter` (botões 7d/14d/30d/Todos) ao lado do campo de busca
- Adicionar checkbox no header e em cada row da tabela
- Barra de seleção (sticky, estilo similar a `BulkActionsBar`): mostra contagem, botão "Executar" (dropdown com "Sequência" / "Lista"), botão "Remover Selecionados"
- Renderizar os dois novos dialogs

---

**2. `src/components/group-campaigns/dialogs/ExecuteSequenceDialog.tsx`** (novo)

- Props: `open`, `onOpenChange`, `selectedMembers: GroupMember[]`, `campaignId: string`
- Usa `useSequences(campaignId)` para listar sequências ativas
- Busca de sequência + seleção por radio
- Para cada sequência, busca contagem de nós via `useSequenceNodes`
- Opções: "Imediatamente" ou "Agendar", checkbox "Enviar apenas para ativos"
- Resumo: nome da sequência, membros, total de mensagens
- Ao confirmar: chama `execute-message` para cada membro individualmente com `targetPhones` (novo parâmetro)

---

**3. `src/components/group-campaigns/dialogs/ExecuteListDialog.tsx`** (novo)

- Props: `open`, `onOpenChange`, `selectedMembers: GroupMember[]`, `campaignId: string`
- Usa `useGroupMessages(campaignId)` (filtra mensagens ativas sem sequência, ou todas)
- Seleção de mensagem com pré-visualização do conteúdo
- Opções: intervalo entre mensagens (3/5/10/15/30s), enviar agora ou agendar
- Resumo: nome da mensagem, membros, tempo estimado
- Ao confirmar: chama `execute-message` com `messageId` + `targetPhones`

---

**4. `supabase/functions/execute-message/index.ts`**

- Adicionar campo `targetPhones?: string[]` no `ExecuteMessageRequest`
- Quando `targetPhones` presente: sobrescrever `destinations` com lista de destinos privados (cada phone vira um JID no formato `{phone}@s.whatsapp.net`)
- Isso permite reutilizar toda a lógica existente de envio de nós/mensagens, apenas mudando os destinatários

---

**5. `src/components/group-campaigns/dialogs/index.ts`** — exportar os novos dialogs

---

### Detalhes Técnicos

**Filtro de período**: aplica `subDays(new Date(), days)` e filtra `member.joinedAt >= threshold`

**Seleção**: o checkbox do header seleciona/desseleciona todos da página atual (paginados). Barra mostra total selecionado com opção "Selecionar todos os X" (todos filtrados).

**Extensão do execute-message**:
```typescript
// No ExecuteMessageRequest, adicionar:
targetPhones?: string[];

// Na determinação de destinations (linha ~600):
const destinations: DestinationData[] = targetPhones && targetPhones.length > 0
  ? targetPhones.map(phone => ({
      group_jid: `${phone}@s.whatsapp.net`,
      group_name: phone,
      isPrivate: true,
    }))
  : sendToPrivate && triggerContext
    ? [{ group_jid: triggerContext.respondentJid, ... }]
    : groups.map(g => ({ ... }));
```

### Fluxo do Usuário
1. Filtra membros por período de entrada (7d/14d/30d/todos)
2. Seleciona membros via checkbox (individual ou em massa)
3. Clica "Executar" → escolhe "Sequência" ou "Lista"
4. No dialog, seleciona a sequência/mensagem, configura opções
5. Confirma → mensagens são enviadas privativamente para cada membro selecionado

