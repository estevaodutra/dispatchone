

## Plano: Restaurar botão Sync na página de Leads

O botão de sincronização foi removido da área de ações do `PageHeader`. A função `handleSync` ainda existe no código (linhas ~139-198), assim como o estado `isSyncing`. Basta adicionar o botão de volta na área de ações, antes do dropdown "Extrair".

### Correção em `src/pages/Leads.tsx` (linha ~227)

Adicionar o botão Sync dentro do `<div className="flex gap-2">`:

```typescript
<Button variant="outline" className="gap-2" onClick={handleSync} disabled={isSyncing}>
  <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
  Sync
</Button>
```

Será inserido antes do dropdown "Extrair". Nenhuma outra mudança necessária — `handleSync`, `isSyncing`, `RefreshCw` e `cn` já estão importados.

