

## Plano: Adicionar agendamento semanal (recorrente) ao NewMessageDialog

### Alteração

**Arquivo: `src/components/group-campaigns/sequences/NewMessageDialog.tsx`**

Adicionar uma terceira opção de agendamento "Dias da semana" ao radio group, com:
- Seletor de dias da semana (Dom–Sáb) como toggle buttons
- Campo de horário (time input)
- Texto explicativo: "Mensagem será enviada nos dias selecionados às HH:mm"

Estado adicional:
- `recurringDays: number[]` (0=Dom ... 6=Sáb)
- `recurringTime: string` ("08:00")

No `handleSave`, quando `scheduleType === "recurring"`:
```ts
schedule.days = recurringDays;
schedule.times = [recurringTime];
```

Isso é compatível com o formato `config.schedule` já usado pelo `UnifiedNodeConfigPanel` e pelo `process-scheduled-messages`.

### Resumo
- 1 arquivo modificado
- ~30 linhas adicionadas
- Compatível com o modelo de dados existente

