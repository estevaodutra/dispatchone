
# Fix: Status "ended" nao mapeado para "completed" no call_logs

## Problema

O endpoint `POST /call-status` recebe `status: "ended"` do provedor externo e grava esse valor diretamente no campo `call_status` da tabela `call_logs`. Porem, o painel (CallPanel) espera o valor `"completed"` para ligacoes encerradas com sucesso.

O lead e atualizado corretamente para `"completed"` (linha 483-484), mas o `call_logs` fica com `"ended"`, que nao esta em nenhum grupo de status do frontend e acaba aparecendo como "falha".

## Solucao

No arquivo `supabase/functions/call-status/index.ts`, mapear o status antes de gravar no banco:

- `"ended"` deve virar `"completed"` no `call_status` do call_logs
- `"error"` deve virar `"failed"`
- `"dialing"` permanece como esta

## Alteracao

### Arquivo: `supabase/functions/call-status/index.ts`

Na linha 440-442, adicionar mapeamento de status:

```text
Antes:
  const updateData: any = {
    call_status: status,
  };

Depois:
  // Mapear status do provedor para status interno
  const statusMap: Record<string, string> = {
    'dialing': 'dialing',
    'ended': 'completed',
    'error': 'failed',
  };
  const mappedStatus = statusMap[status] || status;

  const updateData: any = {
    call_status: mappedStatus,
  };
```

Tambem atualizar a linha 423 (quando cria um novo call_log) para usar o mesmo mapeamento, e as linhas 482-487 (update de lead status) para usar `mappedStatus` em vez de `status`.

A funcao sera reimplantada automaticamente apos a alteracao.
