
# Padronizar formatacao de numeros de telefone

## Problema

A funcao `formatPhone` no Painel de Ligacoes (`CallPanel.tsx`) so trata numeros com 11 e 13 digitos. Numeros com 10 ou 12 digitos (ex: `553298366089`, `5531889774300`) sao exibidos sem formatacao. A pagina de Leads ja tem uma versao mais completa que trata 10, 11, 12 e 13 digitos.

## Solucao

Criar uma funcao utilitaria compartilhada em `src/lib/utils.ts` e reutiliza-la em todos os locais que formatam telefone.

## Alteracoes

### 1. `src/lib/utils.ts` - Adicionar funcao compartilhada

Adicionar a funcao `formatPhone` que cobre todos os tamanhos de numeros brasileiros:

- **13 digitos** (55 + DDD + 9 digitos): `+55 (18) 99620-7384`
- **12 digitos** (55 + DDD + 8 digitos): `+55 (31) 3298-3660`
- **11 digitos** (DDD + 9 digitos): `(18) 99620-7384`
- **10 digitos** (DDD + 8 digitos): `(31) 3298-3660`
- Outros tamanhos: retorna o valor original

### 2. `src/pages/CallPanel.tsx` - Usar funcao compartilhada

- Remover a funcao `formatPhone` local (linhas 106-117)
- Importar `formatPhone` de `@/lib/utils`

### 3. `src/pages/Leads.tsx` - Usar funcao compartilhada

- Remover a funcao `formatPhone` local (linhas 142-149)
- Importar `formatPhone` de `@/lib/utils`

## Resultado

Todos os numeros de telefone serao exibidos com formatacao consistente em toda a aplicacao, incluindo numeros com codigo de pais (55) e sem.
