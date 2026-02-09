
# Plano: Fazer as Ações Funcionarem

Atualmente, ao selecionar um "Tipo de Ação" (Webhook, Iniciar Sequencia, etc.), apenas o tipo e salvo no banco, mas nao ha campos de configuracao nem logica de execucao. Este plano adiciona campos dinamicos por tipo e a execucao automatica ao finalizar uma ligacao.

---

## Problema Atual

1. O formulario de criacao/edicao de acoes nao exibe campos de configuracao especificos por tipo
2. Quando o operador finaliza uma ligacao com uma acao, o sistema apenas salva o `result_action_id` no lead -- nao executa nenhuma automacao

---

## Parte 1: Campos de Configuracao Dinamicos no Formulario

Adicionar campos condicionais no dialog de criacao/edicao de acoes que aparecem conforme o tipo selecionado:

| Tipo de Acao | Campos de Configuracao |
|---|---|
| Iniciar Sequencia | Select para escolher uma sequencia existente (do grupo de campanhas) |
| Adicionar Tag | Input de texto para o nome da tag |
| Atualizar Status | Select com os status possiveis do lead (pending, completed, failed, etc.) |
| Webhook | Input para URL do webhook |
| Apenas Registrar | Nenhum campo adicional |

### Arquivo: `src/components/call-campaigns/tabs/ActionsTab.tsx`

- Adicionar estado `actionConfig` ao `formData`
- Renderizar campos condicionais baseados em `formData.actionType`
- Para "Iniciar Sequencia": buscar sequencias disponiveis usando `useSequences` -- sera necessario saber qual `groupCampaignId` usar. Como a campanha de ligacao pode nao estar vinculada a uma campanha de grupo, usaremos um input de texto para o ID da sequencia (ou um select se houver sequencias acessiveis)
- Salvar a configuracao no campo `actionConfig` da acao

---

## Parte 2: Execucao das Acoes ao Finalizar Ligacao

### Arquivo: `src/hooks/useCallLeads.ts`

Modificar a mutacao `completeLeadMutation` para, apos salvar o resultado:

1. Buscar a acao selecionada (com `action_config`) da tabela `call_script_actions`
2. Executar a automacao conforme o tipo:

```text
start_sequence -> Invocar edge function trigger-sequence/{sequenceId}
add_tag        -> Atualizar custom_fields do lead adicionando a tag
update_status  -> Atualizar o status do lead para o valor configurado
webhook        -> Fazer POST para a URL configurada com dados do lead
none           -> Nada (apenas registro)
```

### Logica de execucao por tipo:

**start_sequence:**
- Chamar `supabase.functions.invoke("trigger-sequence/" + sequenceId, { body: leadData })`

**add_tag:**
- Atualizar `custom_fields` do lead adicionando a tag ao array `tags`

**update_status:**
- Ja atualiza o status como "completed"; substituir pelo status configurado

**webhook:**
- `fetch(url, { method: "POST", body: JSON.stringify({ lead, action, campaign }) })`

---

## Parte 3: Exibir Configuracao na Lista de Acoes

### Arquivo: `src/components/call-campaigns/tabs/ActionsTab.tsx`

Na lista de acoes, exibir um resumo da configuracao abaixo do tipo:
- "Sequencia: {nome}" para start_sequence
- "Tag: {tag}" para add_tag  
- "Status: {status}" para update_status
- "URL: {url}" para webhook

---

## Arquivos Modificados

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/call-campaigns/tabs/ActionsTab.tsx` | Campos dinamicos no formulario + exibicao de config na lista |
| `src/hooks/useCallLeads.ts` | Logica de execucao das acoes ao finalizar ligacao |
| `src/hooks/useCallActions.ts` | Garantir que `actionConfig` seja salvo/retornado corretamente |

---

## Detalhes Tecnicos

### Estrutura do `actionConfig` por tipo:

```typescript
// start_sequence
{ sequenceId: "uuid-da-sequencia" }

// add_tag
{ tag: "venda-concluida" }

// update_status
{ status: "completed" | "failed" | "no_answer" | "busy" }

// webhook
{ url: "https://example.com/webhook" }

// none
{}
```

### Fluxo de Execucao no completeLead:

```text
Operador clica em acao
  -> Salva result_action_id + notes no lead
  -> Cria registro no call_logs
  -> Busca action_config da acao selecionada
  -> Switch por action_type:
       start_sequence -> invoke trigger-sequence
       add_tag -> update lead custom_fields
       update_status -> update lead status
       webhook -> fetch POST
       none -> noop
  -> Toast de sucesso/erro
```

### Dependencias existentes utilizadas:
- `trigger-sequence` edge function (ja existe)
- `useCallActions` hook (ja existe)
- `supabase.functions.invoke` (ja disponivel)
