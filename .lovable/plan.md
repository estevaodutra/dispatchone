

## Plano: Timeline Horizontal de Mensagens na Sequência

### Contexto
Atualmente, ao editar uma sequência dentro de uma campanha de grupo, o usuário vê um **builder drag-and-drop** com paleta lateral + canvas vertical. O pedido é substituir essa visão por uma **timeline horizontal de cards** ordenados por data/hora de disparo, com filtros, status visuais e modais de criação/edição.

O modelo de agendamento atual (dias da semana + horários recorrentes) será expandido para suportar também **data/hora fixa** e **delay relativo**.

### Escopo de Alterações

**Nenhuma migração de banco necessária** — o campo `config` dos `sequence_nodes` é JSONB e já aceita qualquer estrutura. Apenas expandimos os campos dentro de `config.schedule`.

---

### Novos Componentes (4 arquivos)

**1. `src/components/group-campaigns/sequences/MessageCard.tsx`**
- Card com header colorido por status (cinza/amarelo/verde/vermelho/escuro)
- Preview do conteúdo por tipo (texto truncado, thumbnail, enquete, etc.)
- Menu de ações (⋯): Editar, Duplicar, Pausar, Mover, Excluir
- Status calculado: `scheduled` | `today` | `sent` | `error` | `paused`
- Mostra data/hora programada ou "Hoje - HH:mm"

**2. `src/components/group-campaigns/sequences/MessageTimeline.tsx`**
- Container com scroll horizontal
- Linha de timeline com pontos coloridos conectados
- Datas/horas abaixo de cada ponto
- Filtros no topo: status e tipo de mensagem
- Barra de stats no rodapé (total, enviadas, hoje, agendadas)
- Botão "+ Nova Mensagem"
- Ordena cards por `getScheduleDate(node)`

**3. `src/components/group-campaigns/sequences/NewMessageDialog.tsx`**
- Modal com 2 passos:
  - **Passo 1**: Grid de tipos (Texto, Imagem, Vídeo, Áudio, Documento, Botões, Lista, Enquete)
  - **Passo 2**: Formulário com seção de agendamento (data fixa ou delay) + conteúdo da mensagem
- Ao salvar, cria um novo `LocalNode` e abre o `UnifiedNodeConfigPanel` para edição detalhada
- Agendamento: radio "Data e hora específica" vs "Delay após entrada"
  - Fixo: DatePicker + TimePicker
  - Delay: valor + unidade (minutos/horas/dias) + horário de envio

**4. `src/components/group-campaigns/sequences/TimelineSequenceBuilder.tsx`**
- Substitui o `SequenceBuilder` atual quando estiver no modo timeline
- Mantém header com nome da sequência, badge ativa/inativa, auto-save
- Renderiza `MessageTimeline` como corpo principal
- Ao clicar "Editar" num card, abre `UnifiedNodeConfigPanel` (reutiliza o dialog existente)
- Mantém `TriggerConfigCard` para configuração do trigger da sequência

---

### Componentes Modificados

**5. `src/components/group-campaigns/tabs/SequencesTab.tsx`**
- Ao entrar em edição, renderiza `TimelineSequenceBuilder` em vez de `SequenceBuilder`
- Passa os mesmos props (`sequence`, `onBack`, `onUpdate`)

**6. `src/components/sequences/UnifiedNodeConfigPanel.tsx`**
- Expandir `NodeScheduleSection` para suportar o novo modelo de agendamento:
  - Adicionar radio toggle: "Data fixa" vs "Delay relativo" vs "Recorrente (dias da semana)"
  - Data fixa: `config.schedule.fixedDate` (ISO string) + `config.schedule.fixedTime` (HH:mm)
  - Delay: `config.schedule.delayValue` + `config.schedule.delayUnit` + `config.schedule.delayTime`
  - Manter modo recorrente atual como terceira opção (compatibilidade)

---

### Estrutura do `config.schedule` expandida

```typescript
interface NodeSchedule {
  enabled: boolean;
  // Modo: 'fixed' | 'delay' | 'recurring' (default: recurring para compatibilidade)
  scheduleType?: 'fixed' | 'delay' | 'recurring';
  // Fixed
  fixedDate?: string;  // "2024-09-15"
  fixedTime?: string;  // "15:00"
  // Delay
  delayValue?: number;
  delayUnit?: 'minutes' | 'hours' | 'days';
  delayTime?: string;  // "08:00"
  // Recurring (existente)
  days?: number[];
  times?: string[];
}
```

### Status do Card — lógica

```text
if config.paused → 'paused'
if hasErrorLog(nodeId) → 'error'  
if hasSentLog(nodeId) → 'sent'
if scheduleDate is today → 'today'
else → 'scheduled'
```

Os logs de envio já existem em `group_message_logs` com `sequence_id` e `node_order`. O componente fará um query para buscar o último status de envio por nó.

---

### Resumo de Arquivos

| Arquivo | Ação |
|---------|------|
| `MessageCard.tsx` | Criar |
| `MessageTimeline.tsx` | Criar |
| `NewMessageDialog.tsx` | Criar |
| `TimelineSequenceBuilder.tsx` | Criar |
| `SequencesTab.tsx` (group) | Modificar |
| `UnifiedNodeConfigPanel.tsx` | Modificar (schedule section) |

### Impacto
- 4 novos arquivos, 2 modificados
- Sem migrações de banco
- Compatibilidade total com nodes existentes (campo schedule expandido, não substituído)
- O builder antigo (`SequenceBuilder`) permanece disponível se necessário no futuro

