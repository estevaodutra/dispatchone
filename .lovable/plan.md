

## Adicionar botão "Cancelar Ligação" na aba Em Andamento

### Problema
Ligações com status "em ligação" (answered/in_progress) não podem ser canceladas pela interface. O botão de cancelar só existe para ligações agendadas, e a mutation `cancelCall` só libera o operador para status `dialing`/`ringing`.

### Alterações

**1. `src/hooks/useCallPanel.ts` — expandir `cancelCallMutation`**
- Alterar a condição de release do operador de `["dialing", "ringing"]` para incluir também `["answered", "in_progress"]`
- Adicionar `ended_at: new Date().toISOString()` no update do call_log
- Deletar item correspondente da `call_queue` (por `call_log_id`)

**2. `src/pages/CallPanel.tsx` — adicionar botão cancelar nos cards "Em Andamento"**
- Adicionar um botão com ícone `XCircle` nos cards da aba `in_progress` (junto aos botões "Detalhes" e "Ligar a Seguir")
- Ao clicar, abrir o mesmo `AlertDialog` de confirmação de cancelamento já existente (`cancelEntry` / `handleCancel`)
- Mapear o `inProgressEntry` para um `CallPanelEntry` compatível ao setar `cancelEntry`

