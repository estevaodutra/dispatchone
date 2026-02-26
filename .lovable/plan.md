

## Diagnóstico

O `CallActionDialog` (modal do operador para registrar ação pós-ligação) **não executa automações**. Ele apenas salva o `action_id` no `call_logs` e libera o operador, mas nunca chama o webhook configurado na ação.

O código correto já existe no `registerActionMutation` dentro de `useCallPanel.ts` (linhas 664-774), que executa webhook, sequência, tag e status. Porém o `CallActionDialog` usa seu próprio `handleSave` que ignora completamente a automação.

## Plano

### Arquivo: `src/components/operator/CallActionDialog.tsx`

Após salvar o `call_logs` e liberar o operador (linha ~146), adicionar a execução da automação:

1. Buscar os dados da ação (`action_type`, `action_config`) de `call_script_actions` pelo `selectedActionId`
2. Se `action_type === "webhook"` e `action_config.url` existe, invocar `webhook-proxy` com os dados do lead
3. Se `action_type === "start_sequence"`, invocar a edge function correspondente (dispatch ou group)
4. Se `action_type === "add_tag"`, atualizar `custom_fields.tags` do lead
5. Se `action_type === "update_status"`, atualizar o status do lead
6. Mostrar toast de erro se a automação falhar (sem bloquear o registro da ligação)

Isso reutiliza a mesma lógica que já funciona no `registerActionMutation` do `useCallPanel.ts`.

### Detalhes técnicos

- Importar `supabase.functions.invoke("webhook-proxy", ...)` para o caso webhook
- Buscar dados do lead via `call_leads` para enviar no payload
- O `leadId` já está disponível nas props do componente
- A automação roda após o save principal, dentro de um try/catch separado para não bloquear o registro

