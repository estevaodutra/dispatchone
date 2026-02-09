
# Adicionar botao de detalhes para ligacoes concluidas

## Problema

Ligacoes com status "Concluida" nao exibem nenhum botao de acao no card, impossibilitando o operador de visualizar detalhes como roteiro, notas e acao registrada.

## Alteracao

### `src/pages/CallPanel.tsx` - CallCard

Adicionar um bloco para `category === "completed"` na secao de acoes (apos o bloco de `failed`, linha 522), com um botao para abrir o dialogo de detalhes:

- Botao com icone `Target` (mesmo padrao dos outros status) que chama `onAction(entry)` para abrir o ActionDialog.
- O ActionDialog ja funciona para ligacoes concluidas, pois carrega roteiro e acoes normalmente.

### Codigo

Apos a linha 521 (`{category === "failed" && (...)}`), adicionar:

```typescript
{category === "completed" && (
  <Button variant="outline" size="sm" onClick={() => onAction(entry)}>
    <Target className="h-3.5 w-3.5 mr-1" /> Detalhes
  </Button>
)}
```

Isso permite que o operador abra o dialogo mesmo em ligacoes ja concluidas, podendo ver o roteiro e as acoes registradas.
