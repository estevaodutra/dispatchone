
Objetivo

Corrigir o motivo pelo qual “Reclassificar Tudo” ainda não resolve todos os casos de `pollVote`, e fazer a tela refletir o valor real salvo no backend.

Diagnóstico confirmado

- O evento `4d6709dc-266a-46bd-a5e0-bb88e8c96e6c` já está salvo no backend como `poll_response`.
- Porém ainda existem muitos eventos com `body.pollVote` classificados como `image_message` no banco, então a reclassificação em lote não está concluindo tudo.
- A tela de detalhes usa o objeto da lista (`selectedEvent`) como snapshot local, então pode continuar mostrando valor antigo mesmo depois da reclassificação.

Plano de implementação

1. Sincronizar o modal com o valor mais recente do backend
- Em `src/pages/WebhookEvents.tsx`, trocar o modal para carregar os detalhes pelo ID selecionado usando `useWebhookEventById`.
- Usar esse dado atualizado como fonte principal do modal, em vez de confiar só no objeto vindo da tabela.
- Após “Reclassificar”, “Classificar” e “Reclassificar Tudo”, atualizar a lista e o detalhe aberto.

2. Fazer a reclassificação em lote realmente varrer todos os candidatos
- Em `supabase/functions/reclassify-events/index.ts`, remover a dependência de um único ciclo com teto fixo.
- Processar os candidatos em páginas até acabar, ou retornar `has_more/next_cursor` para o frontend continuar chamando automaticamente até finalizar.
- Priorizar eventos com maior chance de erro (`image_message`, `text_message`, `unknown`) e, dentro deles, reavaliar os que contêm `body.pollVote`.

3. Melhorar o retorno da função de reclassificação
- Retornar métricas mais claras: quantos foram processados, quantos mudaram e se ainda restam eventos.
- Registrar resumo final nos logs para facilitar auditoria.

4. Garantir consistência dos campos do evento
- Ao reclassificar, atualizar sempre `event_type`, `event_subtype`, `classification`, `processing_status` e timestamps relacionados, para evitar casos híbridos como tipo correto com subtipo antigo.

Arquivos envolvidos

- `src/pages/WebhookEvents.tsx`
- `src/hooks/useWebhookEvents.ts`
- `supabase/functions/reclassify-events/index.ts`

Detalhes técnicos

- Hoje o detalhe do evento é exibido a partir do item clicado na tabela, que pode ficar desatualizado após mutações.
- O lote atual ainda deixa eventos para trás; os números no banco mostram que ainda há muitos registros com `pollVote` salvos como `image_message`.
- A correção ideal é combinar:
  - modal com fetch por ID
  - reclassificação paginada/exaustiva
  - retorno com progresso real

Validação depois da implementação

- Abrir um evento com `pollVote` e confirmar que o modal mostra `poll_response` imediatamente após reclassificar.
- Rodar “Reclassificar Tudo” e verificar que a quantidade de eventos com `body.pollVote` classificados como `image_message` cai até zerar.
- Conferir especificamente o evento `4d6709dc-266a-46bd-a5e0-bb88e8c96e6c` na UI após refresh do detalhe.
