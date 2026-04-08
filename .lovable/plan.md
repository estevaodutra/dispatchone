

## Plano: Pular agendamento para gatilhos de evento (member_join / member_leave)

### Problema
Quando o gatilho da sequência é "membro entrar" ou "membro sair", o agendamento não faz sentido — a mensagem deve ser disparada imediatamente após o evento. Atualmente, apenas o gatilho "webhook" pula o passo de agendamento.

### Alteração

**`src/components/group-campaigns/sequences/NewMessageDialog.tsx`** — função `handleSelectType` (linha 118-127):

Expandir a condição que pula o agendamento para incluir `member_join` e `member_leave`:

```typescript
const handleSelectType = (type: string) => {
  setSelectedType(type);
  if (triggerType === "webhook" || triggerType === "member_join" || triggerType === "member_leave") {
    onSave(type, { enabled: false });
    reset();
    onClose();
  } else {
    setStep(2);
  }
};
```

### Arquivos
- `src/components/group-campaigns/sequences/NewMessageDialog.tsx`

