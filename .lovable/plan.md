
Objetivo
- Fazer o botão “Reprocessar” realmente reprocessar (reclassificar) o evento do webhook e, se for identificado (ex.: READ_BY_ME → read_by_me), atualizar automaticamente:
  - event_type / event_subtype / classification
  - processing_status (processed vs pending)
  - campos de contexto (chat_jid, sender_phone, etc.)
- Hoje o botão “Reprocessar” apenas marca o registro como pending no banco, mas não roda a lógica de classificação novamente, por isso “fala que reprocessa mas não vai”.

O que está acontecendo hoje (diagnóstico)
- Para o payload com body.status = "READ_BY_ME", a lógica de classificação já existe e retorna:
  - eventType: "read_by_me"
  - classification: "identified"
- A tela /events tem um botão “Reprocessar” que chama useReprocessEvent().
- useReprocessEvent() atualmente só executa:
  - processing_status = "pending"
  - processed_at = null
  - processing_error = null
- Isso não dispara nenhuma reclassificação; então o registro continua “pending” até você rodar “Reclassificar Tudo”.
- Você também relatou que colocou para reprocessar e não foi: isso bate exatamente com esse comportamento.

Solução proposta (comportamento esperado)
- “Reprocessar” vai:
  1) Chamar uma função de backend para reclassificar somente aquele evento (por ID)
  2) Atualizar o registro com os valores novos
  3) Retornar o evento atualizado (ou pelo menos um resumo) para a UI
  4) Atualizar a listagem/estatísticas para refletir “processed” imediatamente quando a classificação for “identified”.

Mudanças técnicas (alto nível)
1) Backend: estender a função reclassify-events para suportar reprocessamento por ID
- Arquivo: supabase/functions/reclassify-events/index.ts
- Adicionar no parsing do body:
  - event_id?: string
  - force?: boolean (opcional, para “atualizar mesmo se não mudou”, útil em casos de correção de consistência)
- Alterar a query:
  - Se event_id existir: buscar somente esse registro (e validar que user_id = user.id para manter segurança)
  - Senão: manter o comportamento atual (até 1000 eventos, filtros only_pending/only_unknown)
- No loop (ou fluxo “single event”):
  - Rodar classifyEvent() + extractContext()
  - Calcular expectedStatus = identified ? processed : pending
  - Atualizar o registro (como já faz hoje), incluindo processing_status e, idealmente, processed_at:
    - Se expectedStatus = "processed", definir processed_at = now()
    - Se expectedStatus = "pending", definir processed_at = null
  - Retornar um payload que permita a UI mostrar “Reprocessado” e o status final.

2) Frontend: fazer o botão “Reprocessar” chamar o reprocessamento real
- Arquivo: src/hooks/useWebhookEvents.ts
- Substituir o useReprocessEvent():
  - Ao invés de supabase.from('webhook_events').update({processing_status:'pending'})…
  - Passar a chamar: supabase.functions.invoke('reclassify-events', { body: { event_id: id, force: true } })
  - Após sucesso, invalidar queries:
    - ["webhook-events"]
    - ["webhook-events-stats"]
- Ajustar toast/mensagem:
  - Exibir resultado real: “Evento reprocessado: status final = processed/pending”.

3) Frontend: melhorar UX para evitar confusão
- Arquivo: src/pages/WebhookEvents.tsx
- Atualizar o texto do toast do “Reprocessar” para refletir que agora reclassifica de verdade.
- Opcional (recomendado): alterar label para algo mais claro, por exemplo:
  - “Reprocessar (reclassificar)”
  - ou “Reclassificar este evento”
- Opcional: desabilitar botão enquanto a mutation roda e mostrar spinner (mesmo padrão do “Reclassificar Tudo”).

Validações e testes (como vamos confirmar que ficou certo)
1) Criar/selecionar um evento com raw_event.body.status = "READ_BY_ME" que esteja pending/unknown no histórico
2) Clicar “Reprocessar”
3) Confirmar que ele muda para:
  - event_type = "read_by_me"
  - classification = "identified"
  - processing_status = "processed"
4) Confirmar que os cards “Pendentes/Processados” atualizam sem precisar “Atualizar” manualmente
5) (Opcional) Conferir logs do backend para ver:
  - request recebida com event_id
  - update aplicado para o ID

Arquivos que serão modificados
- supabase/functions/reclassify-events/index.ts
  - Suporte a { event_id, force } + atualização de processed_at de forma consistente
- src/hooks/useWebhookEvents.ts
  - Mudar useReprocessEvent para invocar a função de backend (reclassify-events) ao invés de apenas marcar pending
- src/pages/WebhookEvents.tsx
  - Ajustar mensagens/UX do botão “Reprocessar” para ficar coerente com o novo comportamento

Riscos / cuidados
- Segurança: garantir que, quando event_id for usado, o fetch/update continue respeitando user_id = user.id (evita reprocessar evento de outro usuário).
- Compatibilidade: manter o comportamento atual do “Reclassificar Tudo” intacto (sem quebrar filtros only_pending/only_unknown).
- Performance: reprocessar por ID será rápido e não vai varrer 1000 registros.

Resultado final esperado para o seu payload READ_BY_ME
- Ao clicar “Reprocessar” nesse evento específico:
  - Ele deve virar “read_by_me” e sair de “pending” para “processed” imediatamente (sem precisar reclassificar tudo).
