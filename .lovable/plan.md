

## Alterações

### 1. `src/hooks/useOperatorCall.ts` — Adicionar `externalCallId` ao `CallData`

- Adicionar `externalCallId: string | null` na interface `CallData`
- Mapear `data.external_call_id` no `fetchCallData`

### 2. `src/components/operator/CallPopup.tsx` — Mostrar status e ID externo no card

- Exibir o `call_status` real do banco (ex: "dialing", "ringing", "cancelled") como texto visível no card expandido, abaixo das informações do lead
- Exibir o `externalCallId` (ID da ligação retornado pelo webhook) quando disponível, com texto copiável

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useOperatorCall.ts` | Adicionar `externalCallId` ao `CallData` e popular no fetch |
| `src/components/operator/CallPopup.tsx` | Mostrar status raw e external_call_id no card |

