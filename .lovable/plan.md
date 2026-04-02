

## Plano: Exibir configuração de webhook no editor de sequência

### Problema
O `TimelineSequenceBuilder` oculta deliberadamente o `TriggerConfigCard` (linha 267: "Trigger is configured at sequence creation time, not shown here"). Para gatilhos webhook, isso impede o usuário de ver a URL e configurar o mapeamento de campos.

### Solução
Renderizar o `TriggerConfigCard` condicionalmente no `TimelineSequenceBuilder` **apenas quando o triggerType for "webhook"**, logo acima do timeline.

### Alteração

**Arquivo: `src/components/group-campaigns/sequences/TimelineSequenceBuilder.tsx`**

1. Importar `TriggerConfigCard` de `./TriggerConfigCard`
2. Substituir o comentário da linha 267 por renderização condicional:

```tsx
{triggerType === "webhook" && (
  <TriggerConfigCard
    triggerType={triggerType}
    triggerConfig={triggerConfig}
    onTriggerTypeChange={() => {}} // tipo não editável após criação
    onTriggerConfigChange={(config) => setTriggerConfig(config)}
    sequenceId={sequence.id}
  />
)}
```

Isso exibe a URL do webhook + mapeamento de campos para sequências webhook, mantendo oculto para os demais tipos de gatilho.

1 arquivo, ~10 linhas adicionadas.

