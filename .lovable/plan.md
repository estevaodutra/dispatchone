

# Ajustes de Layout no Roteiro Inline e Dialog de Acao

## Problemas identificados

1. **Cores de fundo dos cards do roteiro** -- os backgrounds usam tons claros fixos (`bg-green-50`, `bg-purple-50`, etc.) que criam contraste excessivo dentro do dialog em modo escuro. O texto dentro do card fica escuro sobre fundo claro, destoando do restante da interface.

2. **Botoes de opcao do roteiro** -- os botoes "outline" das perguntas nao tem contraste suficiente no modo escuro; o fundo branco das opcoes destoa.

3. **Espacamento interno** -- o card do roteiro pode ter padding mais generoso para leitura confortavel do texto longo do script.

## Alteracoes

### 1. `src/components/call-campaigns/operator/InlineScriptRunner.tsx`

**Cores adaptativas para dark mode:**
- Trocar os `bgColor` fixos por classes que funcionem em ambos os modos:
  - `bg-green-50` -> `bg-green-50 dark:bg-green-950/30`
  - `bg-blue-50` -> `bg-blue-50 dark:bg-blue-950/30`
  - `bg-purple-50` -> `bg-purple-50 dark:bg-purple-950/30`
  - `bg-yellow-50` -> `bg-yellow-50 dark:bg-yellow-950/30`
  - `bg-red-50` -> `bg-red-50 dark:bg-red-950/30`

**Bordas dos cards:**
- Adicionar cor de borda compativel com o tipo de no (ex: `border-purple-200 dark:border-purple-800` para pergunta).

**Botoes de opcao (perguntas):**
- Adicionar classes `dark:bg-background dark:border-border` para garantir contraste.

**Texto do roteiro:**
- Garantir que o texto use `text-foreground` para funcionar em ambos os temas.

### 2. `src/pages/CallPanel.tsx` - ActionDialog

**Scroll area do roteiro:**
- Adicionar `max-h-[50vh] overflow-y-auto` ao conteudo da aba "Roteiro" para evitar que scripts longos expandam o dialog excessivamente (mesma abordagem ja usada na aba "Acao").

**Espacamento entre tabs e conteudo:**
- Manter `mt-4` consistente em ambas as abas (ja esta assim).

