

# Ações em Massa no Painel de Ligações

## Novas Funcionalidades

Duas novas ações em massa na barra flutuante de seleção do Painel de Ligações:

### 1. Discar em Massa
- Botao "Discar" na barra de acoes em massa
- Ao clicar, executa `dialNow` sequencialmente para todas as ligacoes selecionadas com status `scheduled` ou `ready`
- Exibe progresso via toast (ex: "Discando 3 de 5...")
- Ligacoes em outros status sao ignoradas automaticamente

### 2. Atribuir Operador em Massa
- Botao "Operador" na barra de acoes em massa
- Ao clicar, abre um dialog com select de operadores (lista de `useCallOperators`)
- Opcao "Auto" para limpar operador (setar `NULL`)
- Ao confirmar, executa `updateOperator` para todas as ligacoes selecionadas com status `scheduled` ou `ready`

## Alteracoes Tecnicas

### Arquivo: `src/pages/CallPanel.tsx`

**Novos estados:**
- `bulkOperatorOpen` (boolean) - controla dialog de operador em massa
- `bulkOperatorId` (string) - operador selecionado no dialog
- `bulkDialing` (boolean) - loading durante discagem em massa

**Barra de acoes em massa (linhas 554-579) - adicionar 2 botoes:**
- Botao "Discar" (verde) com icone `Phone` - filtra selecionados por status scheduled/ready e executa `dialNow` em loop
- Botao "Operador" (outline) com icone `Headset` - abre dialog para selecionar operador

**Novo dialog de operador em massa:**
- Select com lista de operadores ativos + opcao "Auto"
- Botao confirmar que faz loop nas selecionadas e chama `updateOperator` ou seta `operator_id = NULL` para Auto

### Arquivo: `src/hooks/useCallPanel.ts`

**Nova mutation `bulkUpdateOperatorMutation`:**
- Recebe `{ callIds: string[], operatorId: string | null }`
- Para cada callId, atualiza `operator_id` no `call_logs`
- Se `operatorId` for null, limpa o campo (modo Auto)
- Tambem atualiza `assigned_operator_id` no `call_leads` correspondente

## Fluxo do Usuario

1. Seleciona multiplas ligacoes via checkbox
2. Barra flutuante aparece com: "Reagendar | Cancelar | **Discar | Operador** | Limpar"
3. **Discar**: executa discagem em lote, ignora nao-agendadas
4. **Operador**: abre dialog, escolhe operador ou "Auto", confirma para aplicar em lote
