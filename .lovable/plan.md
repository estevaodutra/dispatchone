

## Alterações na Aba Fila

**Arquivo: `src/pages/CallPanel.tsx`**

### 1. Remover ícone 📅
Na linha 1068, alterar a lógica do ícone para não incluir "📅" — manter apenas "⚡" para prioritárias:
```
// De: const icon = hasSchedule ? "📅" : qe.isPriority ? "⚡" : "";
// Para: const icon = qe.isPriority ? "⚡" : "";
```

### 2. Tornar coluna "Campanha" sempre visível
Linha 1059: remover `hidden lg:table-cell` → deixar sempre visível.
Linha 1082: mesma mudança na célula de dados.

### 3. Adicionar botão Eye para ver detalhes do lead
- Adicionar estado `viewingQueueLead` para controlar qual lead está sendo exibido.
- Adicionar um botão `Eye` antes do botão Phone em cada linha (tanto para itens de `call_queue` quanto `call_logs`).
- Adicionar um `Dialog` simples mostrando as informações do lead selecionado: nome, telefone, campanha, tentativa, status, agendamento, e observações (se existirem).

O dialog será leve — um card com os dados básicos do lead na fila, sem precisar navegar para outra página.

