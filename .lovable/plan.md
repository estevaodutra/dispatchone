

## Corrigir erro ao deletar instância

### Diagnóstico

Duas tabelas referenciam `instances` sem regra de delete definida (default = RESTRICT), o que bloqueia a exclusão:

- `dispatch_campaigns.instance_id` → `instances(id)` (sem ON DELETE)
- `pirate_campaigns.instance_id` → `instances(id)` (sem ON DELETE)

As demais (`dispatch_logs`, `phone_numbers`, `group_campaigns`) já têm `ON DELETE SET NULL`.

### Solução

Uma migration para alterar as duas foreign keys para usar `ON DELETE SET NULL` (mantendo os dados das campanhas, apenas desvinculando a instância):

```sql
ALTER TABLE dispatch_campaigns DROP CONSTRAINT dispatch_campaigns_instance_id_fkey;
ALTER TABLE dispatch_campaigns ADD CONSTRAINT dispatch_campaigns_instance_id_fkey
  FOREIGN KEY (instance_id) REFERENCES instances(id) ON DELETE SET NULL;

ALTER TABLE pirate_campaigns DROP CONSTRAINT pirate_campaigns_instance_id_fkey;
ALTER TABLE pirate_campaigns ADD CONSTRAINT pirate_campaigns_instance_id_fkey
  FOREIGN KEY (instance_id) REFERENCES instances(id) ON DELETE SET NULL;
```

### Arquivo alterado
- 1 migration SQL (schema change only)

