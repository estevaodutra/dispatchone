

## Plano: Botão "Anterior" que abre o card completo da ligação anterior

### O que muda

O botão "Anteriores" será renomeado para "Anterior" e, ao clicar, buscará a ligação imediatamente anterior do operador (excluindo a atual, com status terminal) e abrirá um **segundo CallActionDialog completo** — com todas as funcionalidades (reagendar, ações, roteiro, etc.). Navegação encadeada com limite de profundidade.

### Alterações em `src/components/operator/CallActionDialog.tsx`

1. **Remover** import e render do `PreviousCallsSheet`
2. **Adicionar prop opcional** `depth?: number` (default 0) — esconde botão "Anterior" quando `depth >= 3`
3. **Renomear** botão de "Anteriores" → "Anterior"
4. **Adicionar estados**: `previousCallData` (dados da ligação anterior) e `showPreviousDialog` (boolean), `loadingPrevious` (boolean)
5. **Ao clicar "Anterior"**: buscar em `call_logs` a ligação mais recente do operador com status terminal (`completed`, `no_answer`, `failed`, `cancelled`, `scheduled`, `busy`, `voicemail`, `timeout`), excluindo o `callId` atual, joined com `call_leads(name, phone)` e `call_campaigns(name, retry_count, is_priority)`
6. **Renderizar** um segundo `CallActionDialog` recursivo com os dados da ligação anterior, passando `depth + 1`
7. Quando não houver ligação anterior, mostrar toast informando

