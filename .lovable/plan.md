

## Plano: Corrigir Erro na Extração de Membros

### Problema
O webhook `group.members` retorna HTTP 200 mas com corpo vazio em alguns grupos (possivelmente timeout ou grupo sem permissão), causando `SyntaxError: Unexpected end of JSON input` no `response.json()`.

### Correção em `src/components/leads/ExtractLeadsDialog.tsx`

1. **Safe JSON parsing (linha ~309-311)**: Ler o corpo como texto primeiro (`response.text()`), verificar se não está vazio, e só então fazer `JSON.parse()`. Se vazio ou inválido, tratar como array vazio em vez de lançar erro fatal.

2. **Adicionar delay entre grupos**: Inserir `await new Promise(r => setTimeout(r, 500))` entre chamadas para evitar rate limiting do webhook.

3. **Continuar mesmo com falha**: A lógica de `catch` já faz `continue` implícito, mas a contagem do grupo com falha não aparece no resumo. Adicionar o grupo com resultado zerado (`total: 0, extracted: 0`) nos stats para visibilidade.

