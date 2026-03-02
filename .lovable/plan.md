

## Problema

As tags exibidas no modal vêm da tabela `leads` (ex: "Grupo | Marcelo Pimenta"), mas a filtragem em `loadFilteredCount` (linha 241-256) e `handleSubmit` (linha 318-324) só verifica `call_leads.custom_fields.tags`. Como os leads não têm essas tags no campo `custom_fields`, o filtro retorna 0.

## Correção

**`src/components/call-panel/CreateQueueDialog.tsx`** — duas funções afetadas:

### 1. `loadFilteredCount` (linhas 227-260)
Quando `selectedTags.length > 0`:
- Buscar phones dos `leads` que possuem as tags selecionadas (`leads.tags` overlaps `selectedTags`)
- Buscar `call_leads` filtrados por status E cujo phone esteja na lista OU cujo `custom_fields.tags` contenha as tags
- Contar o resultado

### 2. `handleSubmit` (linhas 317-324)
Mesmo ajuste: ao filtrar por tags, buscar phones da tabela `leads` que tenham as tags selecionadas e incluir leads cujo phone esteja nessa lista, além dos que já têm tags em `custom_fields`.

### Lógica compartilhada
Criar função auxiliar `getPhonesByTags(campaignId, selectedTags)`:
1. Buscar todos os phones dos `call_leads` da campanha
2. Buscar na tabela `leads` quais desses phones têm `tags` que contenham alguma das tags selecionadas (usando `overlaps`)
3. Retornar set de phones que correspondem

Usar esse set em ambos `loadFilteredCount` e `handleSubmit` para incluir leads que correspondam por phone OU por `custom_fields.tags`.

