

# Padronizar formatacao de telefone na pagina de Leads

## Problema

A funcao `formatPhone` atual so reconhece numeros com 13 ou 11 digitos. Numeros com 12 digitos (ex: `557186476266` -- codigo pais + DDD + 8 digitos sem o 9) nao sao formatados, aparecendo crus na tabela.

## Solucao

Atualizar a funcao `formatPhone` em `src/pages/Leads.tsx` para cobrir todos os formatos de telefone brasileiro:

- **13 digitos** (55 + DDD + 9 digitos): `+55 (71) 98647-6266`
- **12 digitos** (55 + DDD + 8 digitos): `+55 (48) 9811-9374`
- **11 digitos** (DDD + 9 digitos): `(21) 95903-7496`
- **10 digitos** (DDD + 8 digitos): `(21) 3456-7890`
- Outros tamanhos: retorna o valor original

### Codigo atualizado

```text
const formatPhone = (phone: string) => {
  const clean = phone.replace(/\D/g, "");
  if (clean.length === 13)
    return `+${clean.slice(0,2)} (${clean.slice(2,4)}) ${clean.slice(4,9)}-${clean.slice(9)}`;
  if (clean.length === 12)
    return `+${clean.slice(0,2)} (${clean.slice(2,4)}) ${clean.slice(4,8)}-${clean.slice(8)}`;
  if (clean.length === 11)
    return `(${clean.slice(0,2)}) ${clean.slice(2,7)}-${clean.slice(7)}`;
  if (clean.length === 10)
    return `(${clean.slice(0,2)}) ${clean.slice(2,6)}-${clean.slice(6)}`;
  return phone;
};
```

### Arquivo modificado

- `src/pages/Leads.tsx` (funcao `formatPhone`, linhas 142-147)

