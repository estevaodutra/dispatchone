
# Adicionar gatilho "Acionador por Acao" nas Sequencias de Dispatch

## O que sera feito

Adicionar um quinto tipo de gatilho chamado **"Acionador por Acao"** na lista de gatilhos disponiveis ao criar/visualizar sequencias de dispatch. Este gatilho permite disparar a sequencia quando uma acao especifica e executada (por exemplo, clique em botao, resposta a mensagem, etc.).

## Alteracoes

### Arquivo: `src/components/dispatch-campaigns/sequences/DispatchSequenceList.tsx`

1. Importar o icone `Zap` (ou `MousePointerClick`) do `lucide-react` para representar o gatilho de acao
2. Adicionar nova entrada no array `TRIGGER_TYPES`:
   - `value: "action"` 
   - `label: "Acionador por Acao"`
   - `description: "Dispara quando uma acao especifica e executada"`
   - `icon: Zap`

Nenhuma alteracao de banco de dados e necessaria -- o campo `trigger_type` ja e do tipo `TEXT` e aceita qualquer valor.
