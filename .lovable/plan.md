

# Mostrar operador no painel e acionar webhook ao iniciar ligacao

## Resumo

Adicionar o nome do operador em cada card de ligacao, permitir trocar o operador, e fazer o botao "Iniciar Ligacao" acionar o webhook de telefonia (categoria "calls") em vez de apenas atualizar o status no banco.

## Alteracoes

### 1. Hook `src/hooks/useCallPanel.ts`

**Incluir dados do operador na query:**
- Adicionar join com `call_campaign_operators(operator_name, extension)` na query select
- Adicionar campos `operatorName: string | null` e `operatorExtension: string | null` na interface `CallPanelEntry`
- Atualizar `DbCallLogJoined` e `transformEntry` para mapear os novos campos

**Adicionar mutacao `updateOperator`:**
- Nova mutacao que atualiza o `operator_id` no `call_logs` e tambem o `assigned_operator_id` no `call_leads`

**Alterar `dialNow` para acionar webhook:**
- Em vez de apenas atualizar o status para "ready", a mutacao vai:
  1. Buscar os dados necessarios (campanha, lead, operador, webhook_config)
  2. Atualizar o status do call_log para "dialing"
  3. Chamar o webhook configurado na categoria "calls" com o payload padrao
  4. Se o webhook retornar um `id`, salvar como `external_call_id`
  5. Em caso de falha no webhook, manter status "ready" e mostrar erro

### 2. Componente `src/pages/CallPanel.tsx`

**No CallCard:**
- Adicionar linha mostrando o nome do operador (icone Headset + nome + ramal) abaixo das informacoes do lead
- Adicionar botao de edicao (icone de lapis) ao lado do nome do operador, visivel apenas para cards com status "scheduled" ou "ready"

**Dialogo de troca de operador:**
- Novo estado `editOperatorEntry` para controlar o dialogo
- Select com lista de operadores ativos da campanha (usando `useCallOperators`)
- Botao de confirmar que chama `updateOperator`

**No botao "Iniciar Ligacao":**
- Manter o comportamento visual, mas agora o `onDialNow` executa a logica completa com webhook

### 3. Detalhes tecnicos

A logica do webhook no `dialNow` sera feita diretamente no frontend (via hook), consultando a tabela `webhook_configs` para a categoria "calls" e fazendo o `fetch` ao URL configurado. O payload seguira o mesmo formato do endpoint `call-dial`:

```text
{
  action: "call.dial",
  call: { id, status, scheduled_for },
  campaign: { id, name },
  lead: { id, phone, name },
  operator: { id, name, extension }
}
```

Se nenhum webhook estiver configurado, o sistema apenas atualiza o status para "ready" como antes.

### Arquivos modificados

- `src/hooks/useCallPanel.ts` -- join do operador, mutacao updateOperator, dialNow com webhook
- `src/pages/CallPanel.tsx` -- exibir operador no card, dialogo de troca, integrar novas funcoes

