

# Plan: Unificar Reagendamento Dentro do Card Principal

## Problema
Quando o operador clica em "Reagendar" no dialog principal, abre um **segundo dialog separado** por cima, quebrando o fluxo. O usuário quer que o formulário de reagendamento apareça inline, dentro do mesmo card.

## Mudança

**Arquivo:** `src/pages/CallPanel.tsx` — Componente `ActionDialog`

### O que muda:

1. **Adicionar estado local** `showReschedule`, `localDate`, `localTime` dentro do `ActionDialog`
2. **Substituir** o botão "Reagendar" que chama `onReschedule(entry)` (abre dialog separado) por um toggle que expande/colapsa um painel inline
3. **Quando clicado "Reagendar"**, expandir uma seção inline abaixo do botão com:
   - Inputs de Data e Horário (grid 2 colunas)
   - Botões rápidos: +10 min, +30 min, +1 hora, Amanhã
   - Botão "Confirmar Reagendamento"
4. **Ao confirmar**, chamar diretamente a função de reagendamento e fechar o dialog
5. **Remover** a prop `onReschedule` do `ActionDialog` (não precisa mais abrir dialog externo)

### Detalhes técnicos:

- O `ActionDialog` passará a receber uma nova prop `onRescheduleConfirm: (entry: CallPanelEntry, scheduledFor: string) => Promise<void>` em vez de `onReschedule`
- O estado de data/hora fica local ao `ActionDialog`
- O botão "Reagendar" alterna `showReschedule` state; quando expandido, mostra os controles inline com um fundo diferenciado (mesmo estilo amber)
- Ao confirmar, chama `onRescheduleConfirm` e fecha tudo

### Layout resultante:

```text
🎯 RESULTADO DA LIGAÇÃO

┌─────────────────────────────────┐
│ 📅 Reagendar                    │
│ A pessoa não pode falar agora   │
│                                 │
│  [Data ___]     [Horário ___]   │
│  [+10min] [+30min] [+1h] [Amanhã]│
│  [Confirmar Reagendamento]      │
└─────────────────────────────────┘

Qual foi o resultado?
[Ação 1]  [Ação 2]
[Ação 3]  [Ação 4]
```

