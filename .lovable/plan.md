

## Implementar ação `custom_message` para operadores

### Resumo
Adicionar o tipo `custom_message` ao sistema de ações de ligação. Quando a campanha tem pelo menos uma ação deste tipo, um campo de texto aparece no pop-up do operador. Ao clicar na ação, a mensagem digitada é salva no `call_logs` e enviada no webhook.

### 1. Migration: adicionar coluna `custom_message` em `call_logs`

```sql
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS custom_message TEXT;
```

A coluna `action_type` na tabela `call_script_actions` já existe e aceita qualquer texto, então `custom_message` já pode ser usado como valor sem alteração de schema.

### 2. Hook: `useCallActions.ts`

- Adicionar `"custom_message"` ao tipo `CallActionType`:
  ```ts
  export type CallActionType = "start_sequence" | "add_tag" | "update_status" | "webhook" | "none" | "custom_message";
  ```

### 3. Tab de Ações: `ActionsTab.tsx`

- Adicionar label no `actionTypeLabels`:
  ```ts
  custom_message: "Mensagem Personalizada",
  ```
- Adicionar campo de config condicional para `custom_message` (config com `webhook_url` para onde enviar):
  ```tsx
  {formData.actionType === "custom_message" && (
    <div className="grid gap-2">
      <Label>URL do Webhook</Label>
      <Input type="url" ... />
      <p className="text-xs text-muted-foreground">
        A mensagem digitada pelo operador será enviada neste webhook.
      </p>
    </div>
  )}
  ```

### 4. Pop-up do operador: `CallActionDialog.tsx`

- Adicionar estado `customMessage` e computar `hasCustomMessageAction`:
  ```ts
  const [customMessage, setCustomMessage] = useState("");
  const hasCustomMessageAction = actions.some(a => a.actionType === "custom_message");
  ```
- Renderizar campo de texto condicional entre as ações e as observações
- No `handleSave`: se a ação selecionada for `custom_message`, incluir `custom_message` no update do `call_logs`
- No `executeAutomation`: tratar tipo `custom_message` enviando webhook com payload incluindo lead, campaign, operator e `custom_message`

### 5. Pop-up alternativo: `RegisterActionModal.tsx`

- Mesma lógica: estado `customMessage`, campo condicional, salvar `custom_message` no `call_logs`

### 6. Edge Function: `execute-call-action/index.ts`

- Adicionar case `"custom_message"` que envia webhook com a mensagem (lê `custom_message` do `call_logs`)

### 7. Histórico: `CallActionDialog.tsx` (aba Histórico)

- Na query de histórico, incluir `custom_message`
- Exibir mensagem enviada quando presente

### Arquivos alterados

1. **Migration SQL** — adicionar `custom_message` em `call_logs`
2. **`src/hooks/useCallActions.ts`** — tipo `custom_message`
3. **`src/components/call-campaigns/tabs/ActionsTab.tsx`** — label + config UI
4. **`src/components/operator/CallActionDialog.tsx`** — campo + save + automation + histórico
5. **`src/components/operator/RegisterActionModal.tsx`** — campo + save
6. **`supabase/functions/execute-call-action/index.ts`** — case `custom_message`

