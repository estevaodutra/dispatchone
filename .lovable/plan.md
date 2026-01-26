## Plano: Implementar Delays Longos com Agendamento em Background ✅ CONCLUÍDO

### Problema Identificado

Os delays não estavam sendo respeitados porque havia um limite de 20 segundos (`MAX_DELAY_MS`) imposto para respeitar o timeout das Edge Functions do Supabase (máximo ~60s).

---

### Solução Implementada

1. **Nova tabela `sequence_executions`**: Criada para rastrear execuções em andamento, com campos para estado atual, próximo node, destinos, e horário de retomada.

2. **Atualização de `execute-message`**:
   - Detecta delays longos (> 20 segundos)
   - Salva estado da execução em `sequence_executions` com `resume_at`
   - Retorna resposta parcial indicando que a execução foi pausada
   - Suporta continuar execuções a partir de um node específico

3. **Atualização de `process-scheduled-messages`**:
   - Verifica execuções pausadas prontas para retomar (`resume_at <= now()`)
   - Chama `execute-message` para continuar de onde parou
   - Mantém lógica existente para mensagens agendadas

---

### Fluxo Atual

```
[Iniciar sequência]
        |
        v
[Processar nodes sequencialmente]
        |
        v
[Node de delay encontrado]
        |
        v
[Delay > 20 segundos?]
   |           |
   SIM         NÃO
   |           |
   v           v
[Salvar em    [Esperar inline]
 sequence_    
 executions]
   |
   v
[Retornar "paused"]
   |
   v
[pg_cron (cada minuto)]
   |
   v
[resume_at <= now()? Continuar execução]
```

---

### Arquivos Modificados

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/execute-message/index.ts` | Suporte a delays longos e execuções pausadas |
| `supabase/functions/process-scheduled-messages/index.ts` | Verificar e retomar execuções pausadas |
| Nova migration | Criada tabela `sequence_executions` |

---

### Benefícios

1. **Delays de minutos/horas** agora funcionam corretamente
2. **Estado persistido** - se a função cair, pode retomar
3. **Compatibilidade** com fluxo existente mantida
4. **Logs detalhados** para debug
