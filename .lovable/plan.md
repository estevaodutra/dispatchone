

## Diagnóstico

O `CallActionDialog` (o popup que o usuário vê na screenshot) **não recebe** as props `callStatus` nem `externalCallId`. Esses campos só aparecem no card pequeno do `CallPopup`, que fica atrás do dialog quando aberto.

## Solução

### 1. `src/components/operator/CallActionDialog.tsx`
- Adicionar props `callStatus?: string` e `externalCallId?: string | null`
- Exibir no header do dialog, abaixo dos badges de campanha/tentativa, o status DB e o ID externo (com botão de copiar)

### 2. `src/components/operator/CallPopup.tsx`
- Passar `callStatus={currentCall.callStatus}` e `externalCallId={currentCall.externalCallId}` ao `CallActionDialog`

