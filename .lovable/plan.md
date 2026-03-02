

## Diagnóstico

A edge function `queue-processor` **não está sendo chamada com sucesso**. Todas as requests retornam "Failed to fetch".

**Causa raiz**: O `queue-processor` não está registrado no `supabase/config.toml`. Sem isso:
- A função pode não ter sido deployada corretamente
- O JWT verification fica ativado por padrão, rejeitando os tokens do Lovable Cloud

O `config.toml` ainda tem a entrada do antigo `queue-executor` (que foi deletado) mas falta a do `queue-processor`.

## Correção

**1. Atualizar `supabase/config.toml`**

- Remover a entrada `[functions.queue-executor]` (função deletada)
- Adicionar `[functions.queue-processor]` com `verify_jwt = false`

Isso é tudo. A função já está escrita e correta. Só precisa ser registrada para deploy com JWT desabilitado.

