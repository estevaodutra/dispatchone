

## Plano: Pular agendamento para sequências webhook

### Problema
Quando o gatilho da sequência é "webhook", o passo 2 (agendamento) não faz sentido — o disparo é controlado pelo webhook. Além disso, o filtro de `group_create` deve ser removido para que apareça sempre.

### Alterações

**Arquivo: `src/components/group-campaigns/sequences/NewMessageDialog.tsx`**

1. **Remover filtro de `group_create`** — a opção aparece sempre, independente do tipo de gatilho
2. **Pular step 2 quando `triggerType === "webhook"`** — ao selecionar um tipo de mensagem, salvar direto com `schedule: { enabled: false }` em vez de ir para a tela de agendamento
3. Manter step 2 normalmente para os demais tipos de gatilho

Lógica no `handleSelectType`:
```tsx
const handleSelectType = (type: string) => {
  setSelectedType(type);
  if (triggerType === "webhook") {
    // Salva direto sem agendamento
    onSave(type, { enabled: false });
    reset();
    onClose();
  } else {
    setStep(2);
  }
};
```

1 arquivo, ~10 linhas alteradas.

