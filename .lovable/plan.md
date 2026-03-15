

## Nova Arquitetura: Endpoint API para Campanha Pirata

### Mudança de Abordagem

Atualmente o fluxo é: Z-API → n8n → webhook-inbound → pirate-process-join. A nova abordagem simplifica: **n8n filtra apenas `GROUP_PARTICIPANT_INVITE` e envia diretamente para um endpoint da API**, eliminando a dependência do webhook-inbound para pirata.

### 1. Criar Edge Function `pirate-leads-api`

Nova edge function que recebe o payload do n8n e processa os leads:

**Payload de entrada (array):**
```json
[
  {
    "group": { "name": "🎁 AULÃO HOJE 20H! #157", "id": "120363425932296878-group" },
    "lead": { "@lid": "15041025855619@lid", "phone": "5512982402981" }
  }
]
```

**Lógica:**
- Autenticação via API key (mesmo padrão do `leads-api`)
- Para cada item do array, buscar campanhas pirata ativas que monitoram o `group.id`
- Reutilizar a lógica existente do `pirate-process-join` (dedup, auto_create_lead, webhook, contadores)
- Retornar resumo: `{ success: true, processed: N, results: [...] }`

**Arquivo:** `supabase/functions/pirate-leads-api/index.ts`

### 2. Adicionar categoria na documentação da API

Adicionar nova categoria `pirate` em `src/data/api-endpoints.ts` com o endpoint `POST /pirate-leads-api`:
- Atributos documentados: `group.name`, `group.id`, `lead.@lid`, `lead.phone`
- Exemplos em cURL, Node.js e Python
- Respostas de sucesso e erro

### 3. Atualizar ícone na sidebar

Adicionar ícone `Skull` (ou `Anchor`) para a categoria `pirate` no mapa `categoryIcons` de `ApiSidebar.tsx`.

### 4. Config e deploy

- Adicionar `[functions.pirate-leads-api]` com `verify_jwt = false` no config
- Deploy da nova edge function

### Arquivos

| Arquivo | Ação |
|---------|------|
| `supabase/functions/pirate-leads-api/index.ts` | Criar |
| `src/data/api-endpoints.ts` | Adicionar categoria `pirate` |
| `src/components/api-docs/ApiSidebar.tsx` | Adicionar ícone |

