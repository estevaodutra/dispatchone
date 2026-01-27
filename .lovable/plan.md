

## Correção: Ordenação da Query de Reclassificação

### Problema Identificado

O bug está na linha 612 do arquivo `supabase/functions/reclassify-events/index.ts`:

```typescript
.order("classification", { ascending: true })  // ERRADO!
```

**Motivo:** Alfabeticamente, `'identified'` (letra 'i') vem **antes** de `'pending'` (letra 'p'). Então ordenar ASC coloca `identified` primeiro, não `pending`.

### Evidência

Query com `ASC` (atual - errada):
```
identified, identified, identified... (2581 eventos)
```

Query com `DESC` (correta):
```
pending, pending, pending... (39 eventos primeiro)
```

### Solução

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/reclassify-events/index.ts` | Linha 612: mudar `ascending: true` para `ascending: false` |

### Mudança Técnica

```typescript
// Linha 609-614 - DE:
query = query
  .order("classification", { ascending: true })  // ❌ ERRADO
  .order("received_at", { ascending: false })
  .limit(1000);

// PARA:
query = query
  .order("classification", { ascending: false })  // ✅ CORRETO: 'pending' > 'identified'
  .order("received_at", { ascending: false })
  .limit(1000);
```

### Resultado Esperado

Após a correção, ao clicar "Reclassificar Tudo":
1. Os 39 eventos `pending/unknown` serão buscados primeiro
2. A função `classifyEvent` será executada e detectará `READ_BY_ME`
3. Os eventos serão atualizados para `read_by_me/identified/processed`
4. O resultado mostrará `reclassified: 39` em vez de `reclassified: 0`

