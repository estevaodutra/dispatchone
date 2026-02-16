
# Corrigir: Ligacao atendida nao finaliza no painel

## Problema Identificado

O provedor externo (API4COM) envia um unico callback com `status: "answered"` contendo todos os dados finais da chamada:
- `external_call_id`
- `status: "answered"` 
- `duration_seconds: 86`
- `audio_url`

Porem, a Edge Function `call-status` trata o status "answered" como "chamada em andamento":
- Apenas define `started_at` (se vazio)
- NAO persiste `duration_seconds`
- NAO define `ended_at`
- NAO libera o operador
- O lead fica como "calling"

Resultado: o card fica preso em "Em ligacao" eternamente, a fila nao avanca, e o operador nao e liberado.

## Evidencia no Banco

```
id: 944e0d79-...
call_status: answered        -- preso aqui
duration_seconds: null       -- nao foi persistido
ended_at: null               -- nunca finalizado
audio_url: presente          -- provedor enviou
```

## Solucao

### 1. Edge Function `call-status` -- Detectar "answered" com dados de finalizacao

Quando o status for `"answered"` E o payload incluir `duration_seconds` OU `audio_url`, tratar como chamada **concluida** (nao "em andamento"):

```typescript
// Antes de mapear o status, detectar se "answered" vem com dados de finalizacao
if (status === 'answered' && (duration_seconds !== undefined && duration_seconds !== null)) {
  // Provedor enviou tudo em um unico evento -- tratar como "ended"
  mappedStatus = 'completed';
  updateData.call_status = 'completed';
  updateData.ended_at = new Date().toISOString();
  updateData.duration_seconds = duration_seconds;
} else if (status === 'answered') {
  // Chamada atendida mas ainda em andamento (sem duracao)
  // Manter como "answered"
}
```

Mudancas especificas no arquivo `supabase/functions/call-status/index.ts`:

**Linhas 440-488**: Adicionar deteccao apos o mapeamento de status. Se `status === 'answered'` e `duration_seconds` esta presente no payload, sobrescrever o `mappedStatus` para `'completed'` e popular `ended_at` e `duration_seconds` no `updateData`.

**Linhas 504-517**: A logica de atualizacao do lead ja trata `completed` corretamente (define `leadStatus = 'completed'`), entao nenhuma mudanca adicional e necessaria aqui.

### 2. Liberar operador quando chamada e concluida via callback

Apos atualizar o call_log para "completed", liberar o operador associado (se houver). Adicionar apos a linha 501 (apos o update do call_log):

```typescript
// Liberar operador se a chamada foi concluida
if (mappedStatus === 'completed' && callLog.operator_id) {
  await supabase
    .from('call_operators')
    .update({
      status: 'available',
      current_call_id: null,
      current_campaign_id: null,
      last_call_ended_at: new Date().toISOString(),
    })
    .eq('id', callLog.operator_id)
    .eq('current_call_id', callLog.id);
}
```

### 3. Corrigir dados existentes no banco

Executar query para corrigir o registro preso atual:

```sql
UPDATE call_logs 
SET call_status = 'completed', 
    ended_at = NOW(), 
    duration_seconds = 86
WHERE id = '944e0d79-8efe-40b1-b890-83bb2ffa27d6';
```

## Resumo das alteracoes

| Arquivo | Mudanca |
|---|---|
| `supabase/functions/call-status/index.ts` | Detectar "answered" com duration_seconds como "completed"; liberar operador em chamadas concluidas via callback |
| Migracao SQL | Corrigir registro preso existente |

## Impacto

- Chamadas atendidas que o provedor reporta com duracao serao finalizadas corretamente
- O operador sera liberado automaticamente, permitindo a fila avancar
- O lead sera marcado como "completed"
- Nenhuma mudanca no frontend e necessaria -- o painel ja trata "completed" corretamente
