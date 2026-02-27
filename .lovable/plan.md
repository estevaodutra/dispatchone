

## Plano: Reagendamento durante ligação + Histórico de ligações anteriores

### Resumo
Duas funcionalidades no `CallPopup.tsx`:
1. Seção "Ações Rápidas" com reagendamento inline durante `dialing`/`ringing`/`on_call`
2. Botão "Ver Anteriores" que abre drawer/sheet com ligações já realizadas pelo operador na sessão

---

### 1. Adicionar reagendamento inline no CallPopup

**Arquivo: `src/components/operator/CallPopup.tsx`**

- Adicionar estados: `showReschedule`, `rescheduleDate`, `rescheduleTime`, `isRescheduling`
- Após o bloco de lead info (linha ~179), antes dos blocos de status (dialing/ringing/on_call), inserir seção "Ações Rápidas" quando `isActive && currentCall`:
  - Botão colapsável "📅 Reagendar — A pessoa não pode falar agora"
  - Ao expandir: inputs date/time, atalhos (+10min, +30min, +1h, Amanhã), botão "Confirmar Reagendamento"
  - Ao confirmar: atualiza `call_logs.scheduled_for` e `call_logs.call_status = 'scheduled'`, chama `rpc('release_operator')`, toast de sucesso
- Usar `Collapsible` do radix-ui (já importado no projeto)
- Importar `addMinutes, addHours, addDays, format, setHours, setMinutes` de date-fns

### 2. Adicionar botão + Sheet de ligações anteriores

**Arquivo: `src/components/operator/CallPopup.tsx`**

- Adicionar estado: `showPreviousCalls`, `previousCalls`, `previousCallsLoading`
- No header do card expandido (linha ~125), adicionar botão "◀ Anteriores" ao lado do minimize
- Ao clicar: buscar `call_logs` do operador de hoje com status terminal, joined com `call_leads(name, phone)` e `call_campaigns(name)` e `call_script_actions(name)`, limitado a 20
- Abrir `Sheet` (side="right" ou "bottom") com:
  - Lista de cards: nome do lead, telefone, campanha, status (atendida/não atendeu/reagendada/falha), duração, horário, ação registrada
  - Resumo no footer: total de ligações, atendidas, não atendidas, reagendadas

**Novo estado no hook `useOperatorCall.ts`:**
- Não é necessário alterar o hook. Os dados serão buscados diretamente no componente quando o sheet abrir.

### 3. Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `src/components/operator/CallPopup.tsx` | Adicionar seção de reagendamento inline + botão/sheet de anteriores |

Nenhum outro arquivo precisa ser criado ou alterado.

