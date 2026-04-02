

## Plano: Remover horário do gatilho — usar horário de cada mensagem

### Contexto

Atualmente o gatilho de agendamento (tanto `scheduled_once` quanto `scheduled_recurring`) configura horários no nível do trigger. Porém, cada nó/mensagem já possui seu próprio `node.config.schedule` com horário individual. O usuário quer que o horário considerado seja o de cada mensagem, não o do gatilho.

### Alterações

**Arquivo: `src/components/group-campaigns/sequences/TriggerConfigCard.tsx`**

1. **`scheduled_once`**: Remover o campo "Horário" (input time), manter apenas o campo "Data". Atualizar a descrição para: "A sequência será executada na data especificada. O horário de cada mensagem será definido individualmente."

2. **`scheduled_recurring`**: Remover toda a seção de horários (modo manual com input de horários + modo intervalo automático). Manter apenas a seleção de dias da semana. Atualizar descrição: "A sequência será executada nos dias selecionados. O horário de cada mensagem será definido individualmente."

3. **Limpar `TriggerConfig`**: Remover os campos `times`, `time`, `mode`, `intervalConfig` da interface (ou deixá-los opcionais para backward compatibility).

4. **Remover código morto**: Remover `newTime` state, `addTime`, `removeTime`, `updateIntervalConfig`, `previewTimes`, `generateTimesFromInterval`, `INTERVAL_OPTIONS`, e imports de `Plus`/`X` se não usados em outro lugar.

### Resumo
- 1 arquivo modificado
- Remove configuração de horário do gatilho
- Cada mensagem/nó define seu próprio horário via `node.config.schedule`

