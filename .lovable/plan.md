

# Embutir Roteiro dentro do Dialogo de Acoes

## Problema

Atualmente o botao "Abrir Roteiro" abre uma nova aba do navegador, tirando o operador do contexto do Painel de Ligacoes. O usuario quer que o roteiro apareca diretamente dentro do dialogo, sem sair da pagina.

## Solucao

Transformar o dialogo de "Registrar Acao" em um dialogo mais amplo com duas abas (ou duas "views" internas): uma para navegar pelo roteiro e outra para registrar a acao final. O operador segue o roteiro e, ao terminar (ou a qualquer momento), troca para a aba de acoes para finalizar.

## Alteracoes

### 1. Ampliar o `ActionDialog` (`src/pages/CallPanel.tsx`)

- Aumentar largura do dialog de `max-w-md` para `max-w-2xl` para acomodar o conteudo do roteiro.
- Adicionar componente `Tabs` (shadcn) com duas abas: **Roteiro** e **Acao**.
- Remover o botao "Abrir Roteiro" que abria nova aba.

### 2. Criar componente inline de roteiro

Extrair a logica de navegacao do roteiro (atualmente em `OperatorScriptView`) para um componente reutilizavel `InlineScriptRunner` dentro de `src/components/call-campaigns/operator/`:

- Recebe `campaignId` e `leadId` como props (em vez de usar `useParams`).
- Renderiza o no atual do roteiro com navegacao (proximo, opcoes de pergunta).
- Nao inclui header, footer nem campo de notas (esses ficam no dialogo pai).
- Expoe callback `onReachEnd` para sinalizar ao dialogo que o roteiro chegou ao fim (pode trocar automaticamente para a aba "Acao").

### 3. Integrar no `ActionDialog`

- Aba "Roteiro": renderiza `InlineScriptRunner` quando `entry.campaignId` e `entry.leadId` existirem. Se nao existirem, mostra mensagem "Roteiro nao disponivel".
- Aba "Acao": conteudo atual do dialogo (lista de acoes, notas, botao cancelar).
- Quando o roteiro atinge um no de tipo `end`, trocar automaticamente para a aba "Acao".

### Layout visual

```text
+------------------------------------------+
| Registrar Acao                           |
| [Lead info]                              |
|                                          |
| [Roteiro]  [Acao]     <-- abas           |
|                                          |
| -- Aba Roteiro --                        |
| +--------------------------------------+ |
| | [Badge Fala]                         | |
| | "Boa tarde, {nome}! Aqui e da..."   | |
| |                                      | |
| |            [ Proximo ]               | |
| +--------------------------------------+ |
|                                          |
| -- Aba Acao --                           |
| | [Acao 1] [Acao 2] ...               | |
| | Observacoes [textarea]               | |
| | Cancelar                             | |
+------------------------------------------+
```

## Detalhes tecnicos

### Novo componente `InlineScriptRunner`

**Arquivo**: `src/components/call-campaigns/operator/InlineScriptRunner.tsx`

**Props**:
- `campaignId: string`
- `leadId: string`
- `onReachEnd?: () => void`

**Logica interna** (extraida de `OperatorScriptView`):
- `useCallScript(campaignId)` para carregar o roteiro
- `useCallLeads(campaignId)` para obter dados do lead (substituicao de variaveis)
- Estado local: `currentNodeId`, `scriptPath`
- Funcoes: `handleNext`, `replaceVariables`, `getOutgoingEdges`
- Sem navegacao (sem `useNavigate`), sem `completeLead` (a finalizacao fica no dialogo pai)

### Modificacoes no `ActionDialog`

- Importar `Tabs, TabsList, TabsTrigger, TabsContent` do shadcn
- Importar `InlineScriptRunner`
- Estado `activeTab` inicializa em `"script"` se roteiro disponivel, senao `"action"`
- Callback `onReachEnd` faz `setActiveTab("action")`
