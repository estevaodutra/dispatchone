

## Plano: Adicionar opcao "Tempo Integral" na Janela de Tempo

### Resumo
Adicionar uma terceira opcao de janela de tempo chamada "Tempo integral" (24h) nas listas de execucao. Quando selecionada, a janela cobre 00:00-23:59 sem necessidade de configurar horarios.

### Alteracoes

**`src/components/group-campaigns/dialogs/ExecutionListConfigDialog.tsx`**
- Alterar tipo do `windowType` para aceitar `"fixed" | "duration" | "fulltime"`
- Adicionar terceiro RadioGroupItem "Tempo integral" com icone Clock
- Quando `fulltime` selecionado, nao mostrar campos de horario/duracao
- No `handleSave`: se `windowType === "fulltime"`, enviar como `window_type: "fixed"` com `window_start_time: "00:00"` e `window_end_time: "23:59"` (reutiliza a logica existente sem precisar alterar banco ou backend)
- No `useEffect` de carregamento do `existing`: detectar se start="00:00" e end="23:59" para pre-selecionar "fulltime"

Nenhuma alteracao no banco de dados, hook ou edge function necessaria — o "fulltime" e mapeado para fixed 00:00-23:59.

