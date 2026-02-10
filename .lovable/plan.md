

# Adicionar aba "Fila" no Painel de Ligacoes

## O que sera feito

Adicionar uma nova aba "Fila" no Painel de Ligacoes que lista todas as ligacoes pendentes na fila de execucao (`call_queue`), organizadas por campanha e posicao. Essa aba mostra os leads aguardando para serem discados automaticamente pelo sistema de execucao em fila.

## Alteracoes

### 1. Criar hook `useCallQueuePanel`

**Arquivo:** `src/hooks/useCallQueuePanel.ts`

Hook dedicado para buscar entradas da fila de todas as campanhas do usuario (diferente do `useCallQueue` que e por campanha). Fara um `select` na tabela `call_queue` com joins em `leads` e `call_campaigns` para exibir nome do lead, telefone, nome da campanha, posicao na fila, tentativas e status.

### 2. Modificar `src/pages/CallPanel.tsx`

**Adicionar aba "Fila" nas tabs de status:**

A aba "Fila" sera inserida como a primeira ou ultima aba no `TabsList`, com um contador mostrando quantos leads estao aguardando (status `waiting`).

**Quando a aba "Fila" estiver selecionada:**

Renderizar uma lista de cards (mesmo estilo dos cards atuais) mostrando:
- Badge "Na Fila" com a posicao (ex: "#3")
- Nome e telefone do lead
- Nome da campanha
- Numero de tentativas anteriores
- Ultimo resultado (se houver)
- Botoes de acao: "Discar Agora" (remove da fila e agenda ligacao) e "Remover da Fila"

**Filtros:** O filtro de campanha ja existente tambem se aplicara a aba Fila.

### 3. Novo componente `QueueCard`

Componente inline dentro do `CallPanel.tsx` (mesmo padrao do `CallCard` existente) para renderizar cada entrada da fila com:
- Borda lateral azul (indicando fila)
- Badge com posicao na fila
- Info do lead (nome, telefone)
- Info da campanha
- Tentativas e ultimo resultado
- Acoes: Remover da fila

## Detalhes tecnicos

- O hook `useCallQueuePanel` buscara `call_queue` com `status = 'waiting'` e join em `leads(name, phone, email)` e `call_campaigns(name)`
- Sem filtro de `campaign_id` fixo (diferente do `useCallQueue` existente) -- busca todas as filas do usuario
- Polling a cada 10s para manter atualizado
- A aba Fila nao interfere nas tabs de status existentes -- e uma aba separada com valor `"queue"` no state `statusFilter`
- Quando `statusFilter === "queue"`, o conteudo principal renderiza a lista de fila em vez dos cards de ligacao

