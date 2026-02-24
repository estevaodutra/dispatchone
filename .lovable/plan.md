

# Plan: Redesign do Modal de Operador — Unificacao Roteiro + Acoes

## Resumo

Substituir os dois modais separados (ScriptModal + RegisterActionModal) por um unico dialog fullscreen com 2 abas (Ligacao e Historico), header destacado com dados do lead/timer, roteiro colapsavel e acoes dinamicas da campanha.

## Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| `src/components/operator/CallActionDialog.tsx` | **CRIAR** — Novo dialog unificado |
| `src/components/operator/CallPopup.tsx` | **MODIFICAR** — Substituir os 2 modais por 1 unico |
| `src/components/operator/ScriptModal.tsx` | Deixa de ser usado (substituido pelo CallActionDialog) |
| `src/components/operator/RegisterActionModal.tsx` | Deixa de ser usado (substituido pelo CallActionDialog) |

## Detalhes Tecnicos

### 1. Novo componente `CallActionDialog.tsx`

Dialog unico com as seguintes secoes:

**Header destacado (fora das abas):**
- Nome do lead em texto grande, centralizado, uppercase
- Telefone em azul com fonte mono
- Badges: campanha, tentativa, prioridade
- Timer da ligacao em verde, fonte grande mono
- Background com gradiente sutil azul

**2 Abas (Tabs):**

**Aba "Ligacao":**
- Secao "Roteiro": usa `InlineScriptRunner` existente, envolvido em `Collapsible` por passo (o InlineScriptRunner ja renderiza passo a passo, entao sera embutido diretamente)
- Separador visual
- Secao "Resultado da Ligacao":
  - Pergunta "O lead atendeu?" com 2 botoes (Atendeu / Nao Atendeu)
  - Se atendeu: grid 2 colunas com acoes da campanha via `useCallActions(campaignId)`
  - Se nao tem acoes: fallback com "Sucesso" e "Sem Sucesso"
  - Acao selecionada mostra config especial (date picker para agendamento, info de webhook, etc.)
  - Campo de observacoes
  - Botoes Cancelar / Salvar e Encerrar

**Aba "Historico":**
- Lista de tentativas anteriores do lead nesta campanha (query `call_logs` por `lead_id` + `campaign_id`)
- Cada tentativa mostra: operador, duracao, resultado, notas
- Secao "Outros contatos" (opcional, futuro)

**Props do componente:**
```typescript
interface CallActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  callId: string;
  campaignId: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  campaignName: string;
  duration: number;
  attemptNumber: number;
  maxAttempts: number;
  isPriority: boolean;
}
```

### 2. Modificar `CallPopup.tsx`

- Remover imports de `ScriptModal` e `RegisterActionModal`
- Remover estados `showScript` e `showAction` separados
- Adicionar estado unico `showCallDialog`
- No estado `on_call`, substituir os 2 botoes (Roteiro + Registrar Acao) por 1 botao "Abrir Painel" que abre o `CallActionDialog`
- Passar todas as props necessarias do `currentCall` para o dialog

### 3. Logica de Salvamento (reutilizada do RegisterActionModal)

A logica `handleSave` sera movida para o novo componente:
- Atualiza `call_logs` com `action_id`, `notes`, `call_status`, `ended_at`, `scheduled_for`
- Chama RPC `release_operator`
- Toast de sucesso/erro

### 4. Historico de Tentativas

Query simples no Supabase:
```typescript
supabase.from("call_logs")
  .select("*, call_operators!call_logs_operator_id_fkey(operator_name)")
  .eq("lead_id", leadId)
  .eq("campaign_id", campaignId)
  .order("created_at", { ascending: false })
```

Isso ja existe parcialmente no `CallPanel.tsx` (`LeadCallHistory`), entao reutilizaremos a mesma logica.

### 5. Nenhuma alteracao de banco necessaria

As tabelas `call_logs`, `call_script_actions`, `call_scripts` e `call_operators` ja possuem todos os campos necessarios. As acoes ja sao carregadas via `useCallActions`.

