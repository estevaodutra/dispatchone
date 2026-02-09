

# Corrigir query do Painel de Ligacoes -- relacionamento ausente

## Problema

A query do painel esta retornando erro 400 porque tenta fazer um join entre `call_logs` e `call_campaign_operators`, mas nao existe uma foreign key entre essas tabelas. O PostgREST exige foreign keys para joins automaticos.

**Erro exato:**
```
Could not find a relationship between 'call_logs' and 'call_campaign_operators' in the schema cache
```

## Solucao

Duas alteracoes necessarias:

### 1. Banco de dados -- adicionar foreign key

Criar uma foreign key de `call_logs.operator_id` para `call_campaign_operators.id`:

```sql
ALTER TABLE public.call_logs
  ADD CONSTRAINT call_logs_operator_id_fkey
  FOREIGN KEY (operator_id)
  REFERENCES public.call_campaign_operators(id);
```

### 2. Verificar foreign keys de lead_id e campaign_id

Confirmar que `call_logs.lead_id` referencia `call_leads.id` e `call_logs.campaign_id` referencia `call_campaigns.id`. Se alguma estiver faltando, adicionar tambem na mesma migracao.

## Resultado

Apos a foreign key ser criada, o PostgREST reconhece o relacionamento e o join `call_campaign_operators(operator_name, extension)` volta a funcionar. Os registros serao exibidos normalmente no painel.

