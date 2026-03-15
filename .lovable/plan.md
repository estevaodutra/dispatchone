

## Persistir campo "Função" da instância no banco de dados

### Problema
O campo "Função" (admin, dispatcher, spy, funnel) não existe na tabela `instances` do banco. O hook `useInstances.ts` hardcoda `function: "dispatcher"` ao transformar dados do banco para o frontend (linha 118). Ao salvar edições, `handleSaveEdit` não inclui `function` nos updates. Resultado: qualquer valor selecionado é perdido ao recarregar.

### Solução

**1. Migração de banco** -- Adicionar coluna `instance_function` à tabela `instances`:
```sql
ALTER TABLE public.instances
  ADD COLUMN instance_function text NOT NULL DEFAULT 'dispatcher';
```

**2. `src/hooks/useInstances.ts`**:
- Adicionar `instance_function` ao tipo `DbInstance`
- Em `transformDbToFrontend`, usar `dbInstance.instance_function` em vez de hardcoded `"dispatcher"`
- Em `createInstanceMutation`, incluir `instance_function` no insert
- Em `updateInstanceMutation`, aceitar `instance_function` nos updates

**3. `src/pages/Instances.tsx`**:
- Em `handleSaveEdit`, incluir `instance_function: editInstance.function` nos updates enviados ao banco
- Em `handleCreateInstance`, incluir `instance_function` no payload de criação

### Arquivos alterados
- Migração SQL (1 coluna nova)
- `src/hooks/useInstances.ts` (~4 pontos de edição)
- `src/pages/Instances.tsx` (~2 pontos de edição)

