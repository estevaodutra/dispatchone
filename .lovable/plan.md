

## Plano: Simplificar card de ação — remover etapa "Atendeu/Não Atendeu" e renomear seção

### Alterações no arquivo `src/components/operator/CallActionDialog.tsx`

**1. Renomear título da seção**
- Linha 219: trocar `"🎯 Resultado da Ligação"` por `"🎯 Ações"`

**2. Remover bloco "O lead atendeu?" (linhas 222-240)**
- Eliminar os botões "Atendeu" / "Não Atendeu" e o parágrafo "O lead atendeu?"
- Remover o estado `answered` e suas referências

**3. Mostrar as ações diretamente (sem condicional `answered === true`)**
- O bloco de ações (linhas 243-289) perde o wrapper condicional `{answered === true && ...}` e fica sempre visível
- Remover o parágrafo "Qual foi o resultado?" (linha 245) já que as ações falam por si

**4. Ajustar lógica de `handleSave`**
- Remover validação `if (answered === null)` (linha 110-112)
- Remover validação `if (answered && !selectedActionId)` (linhas 115-118)
- Adicionar apenas: se `selectedActionId` não foi selecionado, exigir seleção
- Determinar `call_status` com base na ação selecionada em vez de `answered`:
  - Se a ação selecionada for uma das fallback `__failure` ou tiver `actionType` indicando não-atendimento, usar `"no_answer"`; caso contrário, usar `"completed"`
  - Simplificação: sempre usar `"completed"` já que o operador está registrando uma ação concreta

**5. Ajustar botão "Salvar"**
- Linha 348: trocar `disabled={answered === null || (answered && !selectedActionId) || isSaving}` por `disabled={!selectedActionId || isSaving}`

**6. Limpar estado**
- Remover `const [answered, setAnswered] = useState<boolean | null>(null)` (linha 60)
- Remover `setAnswered(null)` do `resetState` (linha 154)

### Resumo de impacto
- Arquivo único: `src/components/operator/CallActionDialog.tsx`
- UX simplificada: ao abrir o dialog, as ações da campanha já aparecem diretamente, sem etapa intermediária
- O operador seleciona a ação, opcionalmente escreve notas, e salva

