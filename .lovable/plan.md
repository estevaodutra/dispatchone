

## Plano: Navegação Anterior/Avançar no CallActionDialog

### Problema atual
O botão "Anterior" abre um dialog recursivo empilhado. Para voltar, o usuário precisa fechar cada card um a um.

### Solução
Substituir a abordagem recursiva por navegação **in-place** com um stack de chamadas. O mesmo dialog mostra diferentes ligações, com botões "◀ Anterior" e "Avançar ▶".

### Alterações em `src/components/operator/CallActionDialog.tsx`

1. **Adicionar estado de navegação**: um array `callStack` que funciona como histórico. Quando clica "Anterior", o call atual é empilhado e os dados do dialog são substituídos pelos da ligação anterior. Quando clica "Avançar", faz pop do stack.

2. **Remover recursão**: eliminar o render recursivo do `CallActionDialog` no final do componente (linhas 565-585) e a prop `depth`.

3. **Criar interface `CallDialogData`** com todos os campos necessários para renderizar o dialog (callId, campaignId, leadId, leadName, leadPhone, campaignName, duration, notes, attemptNumber, maxAttempts, isPriority, callStatus, externalCallId).

4. **Estado principal**: `currentData` (dados exibidos no momento, inicializado pelas props) e `forwardStack: CallDialogData[]` (chamadas para avançar).

5. **Botão "◀ Anterior"**: ao clicar, empilha `currentData` no `forwardStack`, busca a ligação anterior via query existente, seta como `currentData`.

6. **Botão "Avançar ▶"**: visível apenas quando `forwardStack.length > 0`. Ao clicar, empilha `currentData` como "para trás" (ou simplesmente faz pop do forwardStack e seta como currentData).

7. **Layout do header**: colocar "◀ Anterior" à esquerda e "Avançar ▶" à direita do avatar, ambos como botões ghost pequenos.

### Detalhes de implementação

- `backStack: CallDialogData[]` — histórico de navegação para trás (chamadas mais antigas visitadas)
- `forwardStack: CallDialogData[]` — chamadas mais recentes para voltar
- Anterior: push currentData → forwardStack, fetch anterior → set currentData
- Avançar: push currentData → backStack (não necessário pois já temos), pop forwardStack → set currentData
- Resetar stacks quando o dialog fecha
- Quando `currentData` muda, re-fetch history e actions para o novo campaignId/leadId

