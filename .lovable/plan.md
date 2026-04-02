

## Plano: Remover configuração de dias/data do gatilho

### Problema
O gatilho `scheduled_recurring` ainda configura "Dias da semana" e o `scheduled_once` configura "Data". O usuário quer que **toda** especificação de tempo/dia fique nas configurações individuais de cada mensagem.

### Alteração

**Arquivo: `src/components/group-campaigns/sequences/TriggerConfigCard.tsx`**

1. **Remover seção `scheduled_once`** (linhas 177-194): O bloco com input de data. Substituir por texto informativo: "Cada mensagem define sua própria data e horário de execução."

2. **Remover seção `scheduled_recurring`** (linhas 196-224): O bloco com seletor de dias da semana. Substituir por texto informativo: "Cada mensagem define seus próprios dias e horários de execução."

3. **Remover `WEEK_DAYS` constante e `toggleDay` helper** — ficam sem uso.

4. **Limpar `TriggerConfig`**: Campos `days`, `date` ficam opcionais (backward compat) mas não são mais configurados no trigger.

### Resultado
- Os gatilhos agendados funcionam apenas como **classificação** (recorrente vs pontual)
- Toda configuração de quando disparar fica no `node.config.schedule` de cada mensagem
- 1 arquivo modificado

