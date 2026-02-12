
# Adicionar Categoria "Leads" na Documentacao da API

## Objetivo

Adicionar uma nova categoria "Leads" ao array `apiEndpoints` em `src/data/api-endpoints.ts` com dois endpoints documentados que mapeiam para a Edge Function `leads-api` ja existente.

## Endpoints a Documentar

### 1. POST /leads-api/leads -- Cadastrar Lead
- Cadastra um unico lead, com possibilidade de atribuir a uma campanha via `active_campaign_id` e `active_campaign_type`.
- Atributos: `phone` (obrigatorio), `name`, `email`, `tags`, `active_campaign_id`, `active_campaign_type`
- Resposta 201 com o lead criado

### 2. POST /leads-api/leads/import -- Cadastrar Leads em Lote
- Importa multiplos leads de uma vez, com opcoes de atribuicao padrao de campanha e atualizacao de duplicatas.
- Atributos: `leads` (array obrigatorio com phone/name/email/tags/campaign_id/campaign_type), `options` (objeto opcional com `update_existing`, `default_tags`, `default_campaign_id`, `default_campaign_type`)
- Resposta 200 com contadores de importados/atualizados/ignorados

## Alteracoes

### `src/data/api-endpoints.ts`
- Adicionar um novo objeto `EndpointCategory` com `id: "leads"` e `name: "Leads"` ao final do array `apiEndpoints` (antes do `];` na linha 2075)
- Contera os 2 endpoints acima com exemplos completos em curl, Node.js e Python, seguindo o padrao exato das categorias existentes (Mensagens, Ligacoes, etc.)

Nenhuma outra alteracao necessaria -- a pagina `/api-docs` ja renderiza dinamicamente todas as categorias do array.
