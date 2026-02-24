

# Plan: Corrigir Visibilidade de Ações e Roteiro no Dialog do Operador

## Problema Identificado

Analisando o código em `src/pages/CallPanel.tsx` (linhas 1326-1378), as **ações da campanha ficam escondidas** atrás do clique em "Atendeu". O bloco que renderiza as ações está dentro de `{answered === true && (...)}` (linha 1327), então o operador não vê nenhuma ação até clicar em "Atendeu". Antes do refactor, as ações eram exibidas diretamente.

O roteiro está funcionando corretamente (o `InlineScriptRunner` mostra um nó por vez, começando pelo "Início"), mas a percepção é de que "sumiu" porque as ações que complementavam a tela sumiram.

## Mudança Necessária

**Arquivo:** `src/pages/CallPanel.tsx` — Componente `ActionDialog` (linhas 1300-1410)

Reorganizar a seção "Resultado da Ligação" para:

1. **Mostrar TODAS as ações da campanha sempre visíveis** (não esconder atrás de "Atendeu")
2. Manter os botões "Atendeu / Não Atendeu" como seleção de estado, mas as ações da campanha ficam visíveis logo abaixo
3. Quando "Não Atendeu" for selecionado, desabilitar as ações (mas mantê-las visíveis) ou mostrar apenas "Reagendar"
4. O botão "Salvar e Encerrar" deve funcionar com qualquer combinação válida

### Layout novo da seção Resultado:

```text
🎯 RESULTADO DA LIGAÇÃO
─────────────────────────
O lead atendeu?
[📞 Atendeu]    [📵 Não Atendeu]

Se atendeu, qual foi o resultado?
(Ações da campanha)
[✅ Venda]   [📅 Agendar]
[❌ Sem Int] [📱 WhatsApp]

⚠️ Se não há ações: "Nenhuma ação configurada. Usando padrão:"
[✅ Sucesso]  [❌ Sem Sucesso]

📝 Observações (opcional)
[textarea]

[Cancelar] [Salvar e Encerrar]
```

### Detalhes técnicos:

- Mover `displayActions` grid para fora do `{answered === true}` condicional
- Quando `answered === false`: mostrar ações desabilitadas (opacity reduzida) + "Reagendar" como opção principal
- Quando `answered === null`: mostrar ações mas exigir seleção de "Atendeu/Não Atendeu" para salvar
- Manter lógica de `handleSave` e `onSelect` inalterada
- Garantir que `useCallActions(entry.campaignId || "")` recebe o campaignId correto (já confirmado que sim pelo header mostrando o nome da campanha)

