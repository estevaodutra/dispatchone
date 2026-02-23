
# Adicionar opcao de selecionar quantidade de leads para enfileirar

## Objetivo

Atualmente o botao "Discar todos pendente" enfileira **todos** os leads com o status selecionado. O usuario quer poder escolher uma quantidade especifica de leads para enfileirar (ex: "discar os primeiros 50 pendentes").

## Alteracoes

### 1. `src/components/call-campaigns/tabs/LeadsTab.tsx`

- Adicionar um campo `Input` numerico ao lado do botao "Discar todos" para que o usuario possa definir a quantidade (ex: 50, 100, 200).
- Alterar o botao para exibir o texto dinamicamente: "Discar todos pendente" quando nenhum limite e definido, ou "Discar 50 pendente" quando um limite e especificado.
- Passar o parametro `limit` para o dialogo de confirmacao e para a funcao `bulkEnqueueByStatus`.
- No dialogo de confirmacao, exibir a quantidade real que sera enfileirada (o menor entre o limite e o total disponivel).

### 2. `src/hooks/useCallLeads.ts`

- Alterar a mutation `bulkEnqueueByStatus` para aceitar um parametro opcional `limit?: number`.
- Quando `limit` for informado, aplicar `.limit(limit)` na query que busca os leads com o status filtrado, para que apenas a quantidade solicitada seja enfileirada.

## Detalhes Tecnicos

**LeadsTab.tsx** - Novo estado e UI:
- Novo estado: `const [bulkLimit, setBulkLimit] = useState<string>("")`
- Ao lado do Select de filtro (ou ao lado do botao "Discar todos"), adicionar um Input numerico com placeholder "Qtd" (largura pequena, ~80px).
- O botao muda o texto:
  - Sem limite: "Discar todos pendente" (comportamento atual)
  - Com limite: "Discar 50 pendente"
- No dialogo de confirmacao, exibir: "Voce esta prestes a enfileirar **50** leads..." (usando `Math.min(bulkLimit, leadsCountForBulk)` como valor).
- Passar `{ status: bulkDialStatus, limit: bulkLimit ? parseInt(bulkLimit) : undefined }` para `bulkEnqueueByStatus`.

**useCallLeads.ts** - Parametro limit:
- Alterar tipo do parametro: `{ status: CallLeadStatus; limit?: number }`
- Na query de busca, adicionar `.limit(limit)` quando o valor existir:
```text
let query = supabase.from("call_leads")
  .select("id, phone, name")
  .eq("campaign_id", campaignId)
  .eq("status", status);

if (limit) {
  query = query.limit(limit);
}

const { data: matchingLeads, error } = await query;
```

## Resultado

O usuario podera escolher enfileirar uma quantidade especifica de leads em vez de sempre enfileirar todos, dando mais controle sobre o volume de discagens automaticas.
