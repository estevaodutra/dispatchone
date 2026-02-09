
# Adicionar tabela de codigos de status no endpoint call-status

## O que sera feito

Adicionar uma tabela "Codigos Principais" dentro da documentacao do endpoint `/call-status`, exibindo a relacao entre o codigo de status enviado na API e sua descricao em portugues, seguindo o layout da imagem de referencia.

## Alteracoes

### 1. Tipo `Endpoint` (`src/data/api-endpoints.ts`)

Adicionar um campo opcional `statusCodes` na interface `Endpoint`:

```typescript
statusCodes?: { code: string; description: string }[];
```

### 2. Dados do endpoint call-status (`src/data/api-endpoints.ts`)

Adicionar o array `statusCodes` ao endpoint `call-status` com os seguintes valores:

| Codigo | Descricao |
|---|---|
| `NORMAL_CLEARING` | Atendida |
| `USER_BUSY` | Ocupado |
| `UNALLOCATED_NUMBER` | Numero nao encontrado |
| `NUMBER_CHANGED` | Caixa postal |
| `ORIGINATOR_CANCEL` | Cancelamento da ligacao |
| `ALLOTTED_TIMEOUT` | Tempo expirado |

### 3. Componente `EndpointSection` (`src/components/api-docs/EndpointSection.tsx`)

Adicionar um bloco condicional apos a secao de Atributos que renderiza a tabela de codigos quando `endpoint.statusCodes` existir:

- Titulo "Codigos Principais" (h3, mesmo estilo das outras secoes)
- Tabela com duas colunas: "Codigo" e "Descricao"
- Codigo exibido em `<code>` com fundo sutil (estilo mono, similar ao da imagem)
- Descricao em texto normal com negrito
- Linhas alternadas com fundo `bg-muted/30` para legibilidade
