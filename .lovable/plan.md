

# Corrigir chamadas travadas em "Discando" sem operador

## Causa Raiz

No `queue-executor`, o fluxo para novos leads (path 3b, linha 321) cria o `call_log` ja com `call_status: 'dialing'` ANTES de tentar reservar um operador. Se a reserva falha, ele reverte para `'ready'` -- mas se ocorre qualquer erro entre o INSERT e a reversao (timeout, exception, race condition), a chamada fica permanentemente travada como `'dialing'` com `operator_id = NULL`.

Dados atuais no banco confirmam: **todas as chamadas "Discando" na tela do usuario tem `operator_id = NULL`**. Elas nunca tiveram um operador atribuido.

```text
FLUXO ATUAL (path 3b - com bug):

INSERT call_log (status = 'dialing')  <-- Ja marca como "Discando"
       |
       v
reserve_operator_for_call()
       |
  FALHA/TIMEOUT --> reverte para 'ready' (pode falhar!)
       |
  SUCESSO --> atualiza operator_id

RESULTADO: Se a reversao falha, a chamada fica em 'dialing'
           sem operador PARA SEMPRE. UI mostra "Discando".
```

Note que o path 3a (chamadas ja em 'ready') funciona corretamente: primeiro reserva, depois atualiza para 'dialing'. O path 3b faz o inverso.

## Solucao

### 1. Corrigir queue-executor (path 3b)

Alterar o INSERT para criar com `call_status: 'ready'` em vez de `'dialing'`. So atualizar para `'dialing'` APOS reserva bem-sucedida -- consistente com o path 3a.

Arquivo: `supabase/functions/queue-executor/index.ts`

Mudancas:
- Linha 321: `call_status: 'dialing'` passa a ser `call_status: 'ready'`
- Apos reserva bem-sucedida (linha 352-356): adicionar `call_status: 'dialing'` no update

### 2. Self-healing para call_logs orfaos

Adicionar logica no inicio do `processTick()` para detectar e corrigir chamadas travadas: se `call_status = 'dialing'` e `operator_id IS NULL` ha mais de 2 minutos, reverter para `'ready'`.

Arquivo: `supabase/functions/queue-executor/index.ts`

Nova secao apos o heal_stuck_operators (linha 148-151):

```text
SELECT call_logs WHERE call_status IN ('dialing','ringing')
  AND operator_id IS NULL
  AND started_at < NOW() - 2 minutes
UPDATE -> call_status = 'ready', started_at = NULL
```

### 3. Limpar dados existentes (one-time fix)

Na mesma chamada de deploy, os proximos ticks do queue-executor vao automaticamente corrigir os registros orfaos pelo self-healing. Mas tambem vamos adicionar um cleanup imediato no inicio do handler para resolver o backlog atual.

## Arquivos Modificados

1. **`supabase/functions/queue-executor/index.ts`**
   - Path 3b: INSERT com `'ready'` em vez de `'dialing'`
   - Path 3b: Update para `'dialing'` junto com `operator_id` apos reserva
   - Self-healing: reverter call_logs orfaos (dialing sem operador)

## Impacto

- Chamadas sem operador voltarao a aparecer como "AGORA!" (status `ready`) em vez de "Discando"
- O motor de fila reprocessara essas chamadas normalmente no proximo tick
- Nenhuma mudanca no frontend necessaria -- a UI ja exibe `ready` como "AGORA!"
- Nenhuma migracao de banco necessaria

