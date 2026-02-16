
# Adicionar indicador de status da fila na aba "Fila"

## O que muda

Na aba "Fila" do Painel de Ligacoes, sera adicionado um banner no topo mostrando o status consolidado de execucao de todas as campanhas que possuem filas ativas. O usuario podera ver rapidamente se a fila esta executando, pausada, parada ou aguardando operador.

## Como vai funcionar

Um banner compacto aparecera acima da lista de leads na aba Fila, mostrando:
- Status global: "Em execucao", "Pausada", "Parada", "Aguardando operador", etc.
- Quantidade de campanhas com fila ativa
- Indicador visual colorido (verde = rodando, laranja = pausada, cinza = parada)

Se houver multiplas campanhas, o banner mostrara o status agregado (ex: "2 campanhas em execucao, 1 pausada").

## Detalhes tecnicos

### 1. Novo hook: `useQueueExecutionSummary`

Criar um hook leve que busca todos os registros de `queue_execution_state` do usuario (nao filtrado por campanha). Retorna um resumo agregado:

```typescript
// Retorno:
{
  states: QueueExecutionState[],   // todos os estados
  summary: {
    running: number,
    paused: number,
    stopped: number,
    waiting_operator: number,
    waiting_cooldown: number,
  },
  globalStatus: "running" | "paused" | "stopped" | "mixed",
}
```

Busca com polling de 5 segundos (mesmo intervalo do hook existente).

### 2. Componente `QueueStatusBanner`

Componente inline no arquivo `CallPanel.tsx` (seguindo o padrao existente de componentes locais como `QueueCard`, `MetricCard`). Exibe:

- Icone + texto do status
- Badge colorido
- Se filtrado por campanha especifica, mostra o status daquela campanha

### 3. Integracao na aba Fila

Inserir o banner entre a verificacao `isQueueTab` e a lista de cards, antes do `paginatedQueue.map(...)`.

### Arquivos modificados

| Arquivo | Mudanca |
|---|---|
| `src/hooks/useQueueExecution.ts` | Adicionar funcao `useQueueExecutionSummary` que busca todos os estados |
| `src/pages/CallPanel.tsx` | Adicionar banner de status no topo da aba Fila |
