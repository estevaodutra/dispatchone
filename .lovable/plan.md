

## Plano: Uma sequência por gatilho + separar "Agendado" em dois tipos

### Mudanças

**1. Separar tipo "scheduled" em dois (`TriggerConfigCard.tsx`)**

- Alterar `TriggerType` para incluir `"scheduled_recurring"` e `"scheduled_once"` no lugar de `"scheduled"`
- Atualizar `TRIGGER_TYPES` com dois itens:
  - `scheduled_recurring` — "Agendado recorrente" (Clock, laranja) — mostra seletor de dias + horários
  - `scheduled_once` — "Agendado pontual" (CalendarDays, amarelo) — mostra date picker + time
- A config de `scheduled_recurring` usa `days[]` + `times[]` (como o antigo "scheduled")
- A config de `scheduled_once` usa `date` + `time` (data fixa)
- Render condicional: `scheduled_recurring` mostra dias da semana + horários; `scheduled_once` mostra inputs de data e hora

**2. Atualizar `SequenceList.tsx`**

- Atualizar `TRIGGER_TYPES` array com os dois novos tipos
- Atualizar `getTriggerPreview` para tratar `scheduled_recurring` (dias + horários) e `scheduled_once` (data + hora)

**3. Validar unicidade por gatilho na criação (`UnifiedSequenceList.tsx`)**

- Receber as `sequences` existentes no contexto de criação
- No botão "Criar", verificar se já existe uma sequência com o `triggerType` selecionado
- Se existir, mostrar toast de erro: "Já existe uma sequência com este gatilho"
- Desabilitar tipos já usados no seletor (visual: opacidade + indicador "em uso")

**4. Atualizar `SequencesTab.tsx` (group-campaigns)**

- Passar `sequences` para `SequenceList` (já passa)
- A validação será feita dentro de `UnifiedSequenceList`

### Arquivos modificados
- `src/components/group-campaigns/sequences/TriggerConfigCard.tsx` — split scheduled type
- `src/components/group-campaigns/sequences/SequenceList.tsx` — novos trigger types + preview
- `src/components/sequences/UnifiedSequenceList.tsx` — validação de unicidade por gatilho
- `src/components/sequences/shared-types.ts` — se necessário adicionar prop para sequences existentes

### Compatibilidade
- Sequências antigas com `trigger_type = "scheduled"` continuarão funcionando (o backend `process-scheduled-messages` usa `trigger_config.days/times` que é o mesmo formato de `scheduled_recurring`)
- Migração suave: sequências existentes com "scheduled" serão tratadas como "scheduled_recurring" no frontend

