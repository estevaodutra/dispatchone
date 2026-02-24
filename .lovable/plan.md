

## Plano: Campo `obs` no endpoint `/call-dial`

### Resumo

Adicionar campo opcional `obs` ao endpoint `/call-dial`, salvar em nova coluna `observations` na tabela `call_logs`, exibir no popup do operador e pré-preencher no modal de ação. Atualizar documentação.

### 1. Migração de banco de dados

Adicionar coluna `observations` (TEXT, nullable) à tabela `call_logs`:

```sql
ALTER TABLE call_logs ADD COLUMN IF NOT EXISTS observations TEXT;
```

### 2. Edge Function `call-dial`

**Arquivo:** `supabase/functions/call-dial/index.ts`

- Linha 87: extrair `obs` do body junto com os outros campos
- Linhas 454-459 (update existente): adicionar `observations: obs || null`
- Linhas 472-481 (insert novo): adicionar `observations: obs || null`

### 3. Hook `useOperatorCall` — expor observations

**Arquivo:** `src/hooks/useOperatorCall.ts`

- Adicionar `observations: string | null` à interface `CallData` (linha 18-36)
- Na função `fetchCallData`, mapear `data.observations` para o campo (linha ~96)

### 4. Popup do operador — exibir observação

**Arquivo:** `src/components/operator/CallPopup.tsx`

- No bloco `callStatus === "on_call"`, antes dos custom fields, adicionar seção condicional:
```
{currentCall?.observations && (
  <div className="rounded border bg-amber-500/10 border-amber-500/20 p-2">
    <p className="text-xs font-medium text-amber-600">📝 Observação</p>
    <p className="text-sm">{currentCall.observations}</p>
  </div>
)}
```

### 5. Modal de ação — pré-preencher notas

**Arquivo:** `src/components/operator/CallActionDialog.tsx`

- Receber prop `initialObservations?: string`
- Inicializar estado `notes` com `initialObservations || ""`
- Passar a prop a partir do `CallPopup`

**Arquivo:** `src/components/operator/RegisterActionModal.tsx`

- Mesma lógica: receber `initialObservations` e pré-preencher o campo `notes`

### 6. Documentação da API

**Arquivo:** `src/data/api-endpoints.ts`

- Adicionar atributo `obs` na lista de attributes do endpoint `call-dial` (após `lead_name`, ~linha 1868)
- Atualizar exemplos curl/nodejs/python para incluir `"obs": "Cliente VIP - tratar com prioridade"`

### Arquivos impactados

| Arquivo | Tipo de alteração |
|---------|-------------------|
| Migração SQL | Nova coluna `observations` |
| `supabase/functions/call-dial/index.ts` | Extrair e salvar `obs` |
| `src/hooks/useOperatorCall.ts` | Expor `observations` no `CallData` |
| `src/components/operator/CallPopup.tsx` | Exibir observação no card |
| `src/components/operator/CallActionDialog.tsx` | Pré-preencher notas |
| `src/components/operator/RegisterActionModal.tsx` | Pré-preencher notas |
| `src/data/api-endpoints.ts` | Documentação do novo campo |

