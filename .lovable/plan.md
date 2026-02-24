

# Pop-up de Ligacao em Tempo Real para Operadores

## Visao Geral

Criar um sistema de pop-up flutuante que aparece automaticamente quando uma ligacao e atribuida ao operador logado. O pop-up monitora mudancas em tempo real via Supabase Realtime na tabela `call_operators` e `call_logs`, exibindo status da chamada, dados do lead, roteiro da campanha e permitindo registro de acoes.

## Arquitetura

O operador logado e identificado pelo seu `user_id` na tabela `call_operators`. O pop-up escuta mudancas no campo `current_call_id` do operador via Realtime. Quando `current_call_id` muda de null para um UUID, o pop-up busca os dados da chamada (`call_logs` + `call_leads` + `call_campaigns`) e exibe. Quando a chamada termina, mostra cooldown.

## Arquivos Novos

| Arquivo | Descricao |
|---------|-----------|
| `src/hooks/useOperatorCall.ts` | Hook que identifica o operador do usuario logado, escuta Realtime em `call_operators` e `call_logs`, gerencia estado da chamada ativa e timer |
| `src/components/operator/CallPopup.tsx` | Componente pop-up principal com todos os estados (idle, dialing, ringing, on_call, ended, no_answer, failed) |
| `src/components/operator/ScriptModal.tsx` | Modal que exibe o roteiro da campanha usando `useCallScript` e `InlineScriptRunner` |
| `src/components/operator/RegisterActionModal.tsx` | Modal para registrar resultado da ligacao com selecao de acao, observacoes e agendamento |
| `src/components/operator/CooldownOverlay.tsx` | Subcomponente para exibir countdown do intervalo entre ligacoes |

## Arquivos Alterados

| Arquivo | Descricao |
|---------|-----------|
| `src/components/layout/AppLayout.tsx` | Renderizar `<CallPopup />` globalmente dentro do layout |

## Detalhes Tecnicos

### 1. Hook `useOperatorCall`

- Ao montar, busca `call_operators` filtrado por `user_id = auth.uid()` e `company_id = activeCompanyId` para encontrar o operador do usuario logado
- Se o operador tem `current_call_id != null`, busca `call_logs` com joins em `call_leads(name, phone, email, custom_fields)`, `call_campaigns(name, is_priority, retry_count)`, `call_operators(operator_name)`
- Subscreve Realtime no canal `call_operators` filtrado pelo `id` do operador:
  - Quando `current_call_id` muda de null para UUID: busca dados da chamada, seta status
  - Quando `current_call_id` muda para null: marca como ended/cooldown
- Subscreve Realtime no canal `call_logs` filtrado pelo `id` da chamada ativa:
  - Atualiza `call_status` em tempo real (dialing -> ringing -> answered -> completed etc)
- Timer: `useEffect` com `setInterval` de 1s quando status e `on_call`/`answered`/`in_progress`, calcula duracao desde `started_at`
- Expoe: `{ operator, currentCall, callStatus, callDuration, isCallActive, cooldownRemaining }`

### 2. Componente `CallPopup`

Fixo no canto inferior direito (`fixed bottom-6 right-6 z-50`), largura ~400px.

**Estados:**
- `idle`: Barra minima verde "Disponivel - Aguardando..."
- `dialing`: Card expandido com animacao de loading, dados do lead, botao "Cancelar Ligacao"
- `ringing`: Card com animacao pulsante, "Aguardando atendimento...", timer de toque
- `on_call`: Card completo com lead info, custom_fields, botoes [Abrir Roteiro] e [Registrar Acao]
- `ended/completed`: Card com resultado, countdown do cooldown com barra de progresso
- `no_answer`: Card com info de tentativa X de Y, countdown para proxima
- `failed`: Card com mensagem de erro, countdown

Botao de minimizar `[—]` no header que colapsa para barra minima mostrando status + timer.

### 3. ScriptModal

- Dialog fullscreen ou large que renderiza `InlineScriptRunner` existente com `campaignId` e `leadId` da chamada ativa
- Reutiliza toda a logica existente do script runner (nodes, edges, navegacao)

### 4. RegisterActionModal

- Busca acoes da campanha via `useCallActions(campaignId)`
- Lista as acoes configuradas na campanha como cards selecionaveis
- Campo de observacoes (textarea)
- Ao salvar: atualiza `call_logs` com `action_id`, `notes`, `call_status = 'completed'`
- Se acao selecionada e de tipo agendamento: mostra campos de data/hora com atalhos (+1h, +3h, Amanha 9h, Amanha 14h)
- Chama `release_operator` via RPC ao finalizar

### 5. CooldownOverlay

- Recebe `lastCallEndedAt` e `intervalSeconds` do operador
- Mostra countdown regressivo com barra de progresso (reutiliza logica do `CooldownTimer` existente no `OperatorsPanel`)
- Botoes: [Pausar] (muda status para "paused") e [Pular intervalo] (muda status para "available")

### 6. AppLayout

- Importa `CallPopup` e renderiza apos `<main>`
- O CallPopup internamente verifica se o usuario tem operador vinculado; se nao tem, nao renderiza nada

### 7. Realtime

A tabela `call_operators` ja tem Realtime habilitado. A tabela `call_logs` tambem precisa ter Realtime habilitado para atualizar status da chamada em tempo real. Sera necessaria uma migracao SQL:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_logs;
```

### 8. Fluxo Completo

```text
1. Usuario loga -> AppLayout renderiza CallPopup
2. CallPopup busca operador do usuario (call_operators where user_id = auth.uid())
3. Se nao tem operador -> nao renderiza nada
4. Se tem operador -> mostra barra "Disponivel" (idle)
5. Queue-executor atribui chamada -> update call_operators.current_call_id
6. Realtime dispara -> CallPopup detecta nova chamada
7. Busca dados do call_log + lead + campaign
8. Mostra pop-up expandido com status "DISCANDO"
9. call-dial atualiza call_status -> Realtime atualiza para "CHAMANDO"
10. call-status atualiza -> Realtime atualiza para "EM LIGACAO"
11. Operador clica "Abrir Roteiro" -> ScriptModal
12. Operador clica "Registrar Acao" -> RegisterActionModal
13. Operador salva resultado -> release_operator RPC
14. Pop-up mostra cooldown -> countdown
15. Cooldown termina -> volta para "Disponivel"
```

### Observacoes

- Sem notificacao sonora nesta fase (nao ha arquivos de audio no projeto). Pode ser adicionado posteriormente.
- Browser notifications podem ser implementados mas sao opcionais nesta fase.
- O pop-up nao aparece na rota `/call/script/:campaignId/:leadId` (rota de operador legada sem AppLayout).

