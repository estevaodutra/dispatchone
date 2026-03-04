

## Mostrar card completo no modo "Na Fila"

### Problema
Atualmente, quando `isQueuePreview = true` (lead da fila), o `CallActionDialog` esconde:
- Timer de duração (linha 431-435)
- Botões Anterior/Avançar (linhas 359-375)
- InlineReschedule (linhas 466-472)
- Seção de Ações + Observações + botão Salvar (linhas 474-588)

O usuário quer ver **todos** os componentes, mesmo para itens da fila.

### Solução
Remover todas as condições `!isQueuePreview` e `isQueuePreview` do `CallActionDialog.tsx`. O card será renderizado igual independente do status. A única diferença será o badge "📋 Na Fila" que já mostra o status corretamente.

### Alterações em `CallActionDialog.tsx`

1. **Linha 80**: Remover `const isQueuePreview = ...` (variável não será mais usada)
2. **Linhas 359-364**: Mostrar botão "Anterior" sempre (remover condição `!isQueuePreview`)
3. **Linhas 368-375**: Mostrar botão "Avançar" sempre
4. **Linhas 416**: Manter badge "Na Fila" quando `callStatus === "queued"` (lógica inline simples)
5. **Linhas 431-435**: Mostrar timer sempre (remover `!isQueuePreview`)
6. **Linhas 466-472**: Mostrar InlineReschedule sempre
7. **Linhas 474-588**: Mostrar seção Ações/Observações/Salvar sempre
8. **Linhas 590-596**: Remover botão "Fechar" alternativo (o Salvar/Cancelar já serve)

**Nota**: O `handleSave` tentará atualizar `call_logs` com `callId` vazio quando for item da fila — ele falhará silenciosamente ou não encontrará registro. Isso é aceitável pois o usuário terá a opção de fechar com "Cancelar".

