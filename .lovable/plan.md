
# Melhorar labels de status no Painel de Ligacoes

## O que muda

Atualmente os status mostram labels genericos como "Concluida" e "Falha". O objetivo e usar labels que reflitam o resultado real da ligacao.

### Mapeamento atual vs novo

| Status interno | Label atual | Novo label |
|---|---|---|
| completed / answered | Concluida | Atendida |
| no_answer | N/Atendeu | Nao Atendeu |
| busy | Ocupado | Ocupado (sem mudanca) |
| not_found | Nao Encontrada | Nao Encontrada (sem mudanca) |
| voicemail | Caixa Postal | Caixa Postal (sem mudanca) |
| timeout | Tempo Esgotado | Tempo Esgotado (sem mudanca) |
| failed (generico) | Falha | Falha (sem mudanca) |
| cancelled | Cancelada | Cancelada (sem mudanca) |
| dialing/ringing | Discando | Discando (sem mudanca) |
| in_progress | Em ligacao | Em Ligacao (sem mudanca) |

### Abas e metricas

| Local | Atual | Novo |
|---|---|---|
| Metric card | "Concluidas" | "Atendidas" |
| Tab de status | "Concluidas (X)" | "Atendidas (X)" |

## Detalhe tecnico

### Arquivo: `src/pages/CallPanel.tsx`

Tres alteracoes pontuais:

1. **Linha 245** - Badge de status "completed": trocar "Concluida" por "Atendida"
2. **Linha 584** - Metric card label: trocar "Concluidas" por "Atendidas"
3. **Linha 614** - Tab trigger label: trocar "Concluidas" por "Atendidas"

Nenhuma logica de negocio e alterada, apenas os textos exibidos ao usuario.
