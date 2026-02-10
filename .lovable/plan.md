
# Unificar o Layout do Construtor de Sequencias de Disparos com o de Grupos

## Problema

O construtor de sequencias das campanhas de Disparos usa um layout simples com cards lineares e modais (AddStepDialog / EditStepDialog), enquanto o de Grupos usa um layout profissional de 3 paineis (paleta de componentes + canvas + painel de configuracao) com drag-and-drop. Os dois precisam seguir o mesmo padrao visual.

## Solucao

Substituir o `DispatchSequenceBuilder` atual pelo mesmo layout de 3 paineis usado no `SequenceBuilder` de Grupos, adaptado para o modelo de dados de Disparos. Os gatilhos especificos de Disparos serao mantidos (manual, agendado, via API, ao adicionar contato, acionador por acao).

## Alteracoes

### 1. Criar `src/components/dispatch-campaigns/sequences/DispatchTriggerConfigCard.tsx`

Componente de configuracao do gatilho especifico para Disparos, seguindo o mesmo layout visual do `TriggerConfigCard` de Grupos mas com os gatilhos proprios:
- Manual
- Agendado (data/hora)
- Via API (mostra URL do webhook)
- Ao adicionar contato
- Acionador por Acao

### 2. Criar `src/components/dispatch-campaigns/sequences/DispatchNodeConfigPanel.tsx`

Painel lateral de configuracao dos nos, seguindo o mesmo padrao do `NodeConfigPanel` de Grupos. Suportara os tipos:
- Texto (com variaveis {{nome}}, {{telefone}}, {{email}})
- Imagem, Video, Audio, Documento (com URL de midia)
- Botoes, Lista (mensagens interativas)
- Delay (com atalhos rapidos)

### 3. Reescrever `src/components/dispatch-campaigns/sequences/DispatchSequenceBuilder.tsx`

Layout de 3 paineis identico ao de Grupos:
- **Paleta esquerda**: Componentes arrastáveis organizados por categoria (Mensagens, Midia, Interativo, Fluxo)
- **Canvas central**: Lista de nos com drag-and-drop para reordenar e inserir
- **Painel direito**: Configuracao do no selecionado

Mudancas de dados:
- Usar estado local (localNodes) como o builder de Grupos, em vez de salvar passo a passo
- Botao "Salvar" persiste todos os nos de uma vez (delete all + insert) via `useDispatchSteps`
- Incluir TriggerConfigCard no topo (acima dos 3 paineis)

### 4. Atualizar `src/hooks/useDispatchSteps.ts`

Adicionar mutation `saveAllSteps` que:
1. Deleta todos os steps da sequencia
2. Insere os novos steps de uma vez (mesmo padrao do `saveNodes` de Grupos)

Isso permite o fluxo de edicao local com salvamento em batch.

### 5. Remover arquivos obsoletos

- `src/components/dispatch-campaigns/sequences/AddStepDialog.tsx` -- substituido pela paleta drag-and-drop
- `src/components/dispatch-campaigns/sequences/EditStepDialog.tsx` -- substituido pelo NodeConfigPanel
- `src/components/dispatch-campaigns/sequences/StepCard.tsx` -- substituido pelos nos inline no canvas

## Detalhes Tecnicos

### Mapeamento de tipos (Dispatch vs Grupo)

O builder de Grupos usa `nodeType` direto ("message", "image", "video"...), enquanto o de Disparos usa `stepType` + `messageType`. O novo builder continuara salvando no formato do banco de Disparos (`step_type`, `message_type`), mas internamente usara o mesmo sistema de `nodeType` para renderizacao.

### Conversao de dados

```text
Leitura do banco:
  step_type="message", message_type="text"  ->  nodeType="message"
  step_type="message", message_type="image" ->  nodeType="image"
  step_type="delay"                         ->  nodeType="delay"

Escrita no banco:
  nodeType="message" -> step_type="message", message_type="text"
  nodeType="image"   -> step_type="message", message_type="image"
  nodeType="delay"   -> step_type="delay"
```

### Categorias da paleta (adaptadas para Disparos)

- **Mensagens**: Texto
- **Midia**: Imagem, Video, Audio, Documento
- **Interativo**: Botoes, Lista
- **Fluxo**: Delay

(Sem enquete, sticker, localizacao, contato, evento, condicao, notify, webhook -- esses sao especificos de Grupos)

### Salvamento em batch

O `saveAllSteps` no hook seguira o padrao:
1. `DELETE FROM dispatch_sequence_steps WHERE sequence_id = ?`
2. `INSERT INTO dispatch_sequence_steps (...) VALUES (...)` para cada no local

Isso elimina a necessidade de gerenciar IDs de nos locais vs remotos.
