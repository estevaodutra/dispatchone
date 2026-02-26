

## Diagnóstico

O problema está no **`ActionDialog`** dentro de `src/pages/CallPanel.tsx` (linha 1162+). Este é o popup que o admin vê ao clicar em uma ligação na tabela do painel. Ele **não exibe** `callStatus` nem `externalCallId`, apesar de o `CallPanelEntry` já conter esses campos.

O `CallActionDialog` do operador (em `src/components/operator/CallActionDialog.tsx`) já foi corrigido e exibe ambos. Mas o `ActionDialog` do painel principal nunca recebeu essa atualização.

## Alterações

### `src/pages/CallPanel.tsx` — `ActionDialog` (linha ~1234)

Adicionar no header do dialog, logo após os badges de campanha/tentativa/prioridade:

1. Badge com `entry.callStatus` (📡 Status DB)
2. Badge/texto com `entry.externalCallId` (🆔 ID Externo) com botão de copiar

Inserir entre a linha dos badges (1241) e a linha de duração (1243):

```tsx
{entry.callStatus && (
  <Badge variant="outline" className="text-xs">📡 {entry.callStatus}</Badge>
)}
</div>
{entry.externalCallId && (
  <div className="flex items-center justify-center gap-1.5">
    <span className="text-xs text-muted-foreground font-mono truncate max-w-[280px]">
      🆔 {entry.externalCallId}
    </span>
    <button onClick={() => { navigator.clipboard.writeText(entry.externalCallId!); }}>
      <Copy className="h-3 w-3" />
    </button>
  </div>
)}
```

Nenhuma alteração de banco ou hook necessária — os dados já estão disponíveis no `entry`.

