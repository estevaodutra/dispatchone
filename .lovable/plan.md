

# Fix: Erro ao adicionar operador na campanha

## Problema

A tabela `call_campaign_operators` possui uma constraint UNIQUE em `(campaign_id, user_id)`. Como `user_id` e o dono da campanha (e nao o operador), essa constraint impede que o mesmo usuario adicione mais de um operador por campanha.

## Solucao

Remover a constraint UNIQUE via migracao SQL:

```sql
ALTER TABLE call_campaign_operators DROP CONSTRAINT call_campaign_operators_campaign_id_user_id_key;
```

Nenhuma alteracao de codigo e necessaria -- apenas a migracao do banco.

