

## Plano: Agendamento e disparo manual por mensagem na sequência

### O que será feito
Adicionar duas funcionalidades a cada nó (mensagem) dentro do painel de configuração da sequência:

1. **Agendamento individual** — Permitir definir dias da semana e horários específicos para envio de cada mensagem, sem depender de delay
2. **Botão "Disparar agora"** — Enviar manualmente uma mensagem específica da sequência de forma imediata

### Alterações

**1. `src/components/sequences/UnifiedNodeConfigPanel.tsx`**
- Adicionar seção "Agendamento" no final de **todos** os nós de mensagem/mídia (message, image, video, audio, document, buttons, list)
- Campos: toggle "Agendar envio", seleção de dias da semana (chips), horários (lista com botão +/-)
- Botão "Disparar agora" com ícone Play — chama callback `onManualSend`
- Config armazenada em `node.config.schedule: { enabled: boolean, days: number[], times: string[] }`

**2. `src/components/sequences/UnifiedSequenceBuilder.tsx`**
- Adicionar prop opcional `onManualSendNode?: (node: LocalNode) => Promise<void>` ao `UnifiedSequenceBuilderProps`
- Repassar para `renderConfigPanel`

**3. `src/components/sequences/shared-types.ts`**
- Sem alteração estrutural necessária — schedule fica dentro de `config: Record<string, unknown>`

**4. `src/components/group-campaigns/sequences/SequenceBuilder.tsx`**
- Implementar `onManualSendNode` — invocar edge function `execute-message` com `nodeIndex` específico
- Passar para `UnifiedSequenceBuilder`

**5. `src/components/dispatch-campaigns/sequences/DispatchSequenceBuilder.tsx`**
- Implementar `onManualSendNode` — invocar edge function `execute-dispatch-sequence` com step específico
- Passar para `UnifiedSequenceBuilder`

**6. Edge Functions (`execute-message`, `execute-dispatch-sequence`, `process-scheduled-messages`)**
- Suportar parâmetro opcional `nodeIndex` / `stepIndex` para executar apenas um nó específico
- No scheduler, verificar `schedule` config de cada nó antes de executar (dias/horários)

### Fluxo do usuário
1. Abre configuração de um nó (ex: Texto)
2. Ativa toggle "Agendar envio" → aparece seleção de dias e horários
3. Ou clica "Disparar agora" → mensagem é enviada imediatamente
4. Ao salvar, o schedule fica persistido no `config` do nó

### Detalhes técnicos
- O schedule por nó é armazenado em `node.config.schedule` como JSON, sem necessidade de migração de banco
- O botão "Disparar agora" faz `supabase.functions.invoke()` passando `sequenceId` + `nodeIndex`
- O scheduler (`process-scheduled-messages`) já processa nós — precisa apenas checar `node.config.schedule` para filtrar quais nós executar no horário atual

