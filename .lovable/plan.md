
# Remover leads duplicados (mesmo telefone na mesma campanha)

## Problema

A duplicidade nao esta nos `call_logs` isoladamente, mas sim nos `call_leads`: existem 2 registros de lead para "Renata" (telefone 5535998451670) e 2 para "Manoel" (telefone 5561982829944) na mesma campanha. Cada lead gera seu proprio `call_log`, resultando em cards duplicados no Painel.

## Solucao

### 1. Migracao SQL para limpar dados existentes

Para cada telefone duplicado na mesma campanha:
- Manter o `call_lead` mais recente (por `created_at`)
- Deletar os `call_logs` associados aos leads duplicados (os mais antigos)
- Deletar os `call_leads` duplicados (os mais antigos)

Ordem de execucao:
1. Deletar `call_logs` dos leads que serao removidos
2. Deletar `call_leads` duplicados

### 2. Prevenir futuros duplicados

Adicionar constraint UNIQUE em `call_leads` para `(phone, campaign_id)` para que o banco rejeite insercoes duplicadas no futuro.

### 3. Atualizar edge function `call-dial`

Adicionar verificacao por **telefone** (alem de `lead_id`) antes de criar novo `call_lead`, usando upsert ou verificacao previa.

## Dados afetados

- Renata (5535998451670): 2 leads, 2 call_logs em "dialing" - sera mantido 1
- Manoel (5561982829944): 2 leads, 2 call_logs em "dialing" - sera mantido 1

## Arquivos modificados

- Migracao SQL (limpeza + constraint UNIQUE)
- `supabase/functions/call-dial/index.ts` (verificacao por telefone)
