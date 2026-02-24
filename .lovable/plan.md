

# Plan: Corrigir Ações Não Aparecendo + Remover Duplicatas

## Problemas Identificados

### 1. Ações não aparecem para operadores (CAUSA RAIZ)
A tabela `call_script_actions` tem política de segurança `user_id = auth.uid()`. Quando um **administrador** cria as ações, elas ficam vinculadas ao `user_id` dele. Quando um **operador** (outro usuário, membro da empresa) abre o dialog, a política bloqueia a leitura — por isso aparece "Nenhuma ação configurada".

A campanha "FN | Abandono de Funil" tem **3 ações configuradas** no banco, mas o operador não consegue vê-las.

**Solução**: Atualizar a política RLS de `call_script_actions` para permitir leitura por membros da empresa (mesma lógica que `call_campaigns` usa: `is_company_member(company_id)`), fazendo JOIN com `call_campaigns`.

### 2. Botões "Atendeu / Não Atendeu" duplicados
- O `InlineScriptRunner` já renderiza "Atendeu / Não Atendeu" no nó de Início do roteiro
- O `ActionDialog` renderiza **outro par** na seção "Resultado da Ligação"
- Resultado: 4 botões iguais na tela

**Solução**: Remover a seção "O lead atendeu?" do `ActionDialog` e delegar isso ao `InlineScriptRunner`.

### 3. Botões "Sucesso / Sem Sucesso" (fallback) desnecessários
Com as ações aparecendo corretamente, o fallback não é necessário.

**Solução**: Remover os botões fallback e mostrar apenas as ações reais da campanha.

## Mudanças

### Arquivo 1: Migração SQL (RLS)
- Remover política antiga `Users can manage own call_script_actions`
- Criar política de SELECT: permitir leitura se o usuário é membro da empresa da campanha (`call_campaigns.company_id`) OU dono direto
- Manter política de INSERT/UPDATE/DELETE apenas para o dono (`user_id = auth.uid()`)

### Arquivo 2: `src/pages/CallPanel.tsx` — Componente `ActionDialog`
- **Remover** a seção "O lead atendeu?" (linhas 1306-1324) — o InlineScriptRunner já cuida disso
- **Remover** o state `answered` e a lógica condicional de opacidade
- **Remover** os botões fallback "Sucesso / Sem Sucesso"
- **Mostrar** as ações da campanha diretamente, sempre visíveis
- **Ajustar** `handleSave` para funcionar sem o state `answered` — basta ter uma ação selecionada
- Manter botão "Reagendar" e campo de notas

### Layout resultante:

```text
📋 ROTEIRO (InlineScriptRunner)
  [Nó atual com Atendeu/Não Atendeu no início]
─────────────────────────
🎯 RESULTADO DA LIGAÇÃO
  [Reagendar]
  [Ação 1] [Ação 2]    ← ações reais da campanha
  [Ação 3] [Ação 4]

📝 Observações
[textarea]

[Cancelar] [Salvar e Encerrar]
```

