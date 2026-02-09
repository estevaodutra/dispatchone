

# Adicionar botão "Roteiro" no diálogo de Registrar Ação

## Problema

O diálogo "Registrar Ação" no Painel de Ligações mostra apenas as ações configuradas na campanha, mas não oferece acesso ao roteiro (script) da campanha. O operador não consegue abrir o roteiro a partir desse diálogo.

## Solução

Adicionar um botão "Abrir Roteiro" no diálogo de ação que abre a interface de roteiro do operador (`/call/script/:campaignId/:leadId`) em uma nova aba. O botão só aparecerá quando a entrada tiver `campaignId` e `leadId` definidos.

## Alteracoes

### 1. `src/pages/CallPanel.tsx` - Componente ActionDialog

- Importar `FileText` do lucide-react (ícone de roteiro)
- Adicionar um botão "Abrir Roteiro" no topo do diálogo, antes da lista de ações
- O botão abrirá `/call/script/${entry.campaignId}/${entry.leadId}` em nova aba (`window.open`)
- Condição de exibição: `entry.campaignId && entry.leadId` (ambos precisam existir)

### Layout visual do diálogo atualizado

```text
Registrar Ação
  [info do lead / campanha]

  [ Abrir Roteiro ]            <-- NOVO botão

  [Lançamento]                 <-- ações existentes
  [Outra ação...]

  Observações (opcional)
  [textarea]

  Cancelar
```

## Detalhes tecnicos

- O botão usará `window.open(url, '_blank')` para abrir em nova aba sem perder o contexto do painel
- Estilo: `variant="outline"` com ícone `FileText`, largura total
- Só aparece quando `entry.campaignId` e `entry.leadId` estão presentes
