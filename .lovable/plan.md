

# Fix: Remover bloqueio de lead concluido no call-dial

## Problema

O endpoint `POST /call-dial` rejeita chamadas para leads com status `completed`, retornando erro 400 `lead_already_completed`. O comportamento desejado e que o endpoint execute a discagem independentemente do status atual do lead.

## Solucao

Remover o bloco de validacao de status `completed` (linhas 376-399) no arquivo `supabase/functions/call-dial/index.ts`.

O check de `calling` (linhas 401-424) sera mantido, pois faz sentido impedir chamadas duplicadas simultaneas.

Apos remover o bloqueio, o lead existente com status `completed` sera reutilizado normalmente: seu status sera atualizado para `calling` e uma nova entrada em `call_logs` sera criada.

## Alteracao

### Arquivo: `supabase/functions/call-dial/index.ts`

Remover as linhas 376-399 que contem:

```text
if (existingLead.status === 'completed') {
  // ... todo o bloco de rejeicao
}
```

Manter o check de `calling` logo abaixo, que continua valido.

Nenhuma outra alteracao necessaria -- a funcao sera reimplantada automaticamente.

