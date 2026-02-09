

# Corrigir tabela de codigos para usar valores reais do endpoint

## Problema

A tabela "Codigos Principais" exibe codigos de telefonia genericos (`NORMAL_CLEARING`, `USER_BUSY`, etc.), mas o endpoint `/call-status` aceita valores diferentes (`answered`, `busy`, `ended`, etc.). A tabela precisa refletir os valores reais aceitos pela API.

## Alteracao

### `src/data/api-endpoints.ts` - statusCodes do endpoint call-status

Substituir os valores atuais pelos codigos reais aceitos pelo endpoint:

| Codigo atual (errado) | Codigo correto | Descricao |
|---|---|---|
| `NORMAL_CLEARING` | `answered` | Atendida |
| `USER_BUSY` | `busy` | Ocupado |
| `UNALLOCATED_NUMBER` | `not_found` | Numero nao encontrado |
| `NUMBER_CHANGED` | `voicemail` | Caixa postal |
| `ORIGINATOR_CANCEL` | `cancelled` | Cancelamento da ligacao |
| `ALLOTTED_TIMEOUT` | `timeout` | Tempo expirado |

Opcionalmente incluir tambem `dialing`, `ended` e `error` para documentar todos os 9 valores aceitos.

