

# Plano: Limpar Instâncias Fictícias do Banco de Dados

## Problema Identificado

O banco de dados contém instâncias de teste com credenciais fictícias que estão sendo selecionadas pela Edge Function:

### Instâncias Fictícias (a remover)
| ID | Nome | external_instance_id | Status |
|----|------|---------------------|--------|
| `f07ad525-ab6d-4e48-99c1-28209b9353ea` | WhatsApp Suporte | `ext_uvw456` | connected |
| `7bbec8f1-4256-4655-baa4-074e5658564f` | WhatsApp Vendas | `ext_xyz789` | disconnected |
| `df80f647-922a-424e-b659-7f69521f2fe7` | d | token fictício | disconnected |

### Instâncias Reais (manter)
| ID | Nome | external_instance_id | Status |
|----|------|---------------------|--------|
| `07bbc66e-02a9-4203-b77a-c2d98370281b` | Mauro | `3E249F618B74B1ABEF461664B40E8DC7` | connected |
| `843aaaca-5b9b-4126-8b3f-4c2391cf85a4` | Tablet Estevão | `3E2538077560F1BDA48C1664B40E8DC7` | connected |

## Causa Raiz

A query atual na Edge Function busca qualquer instância conectada com credenciais preenchidas:

```typescript
const { data: instance } = await supabase
  .from('instances')
  .select('...')
  .eq('status', 'connected')
  .not('external_instance_id', 'is', null)
  .not('external_instance_token', 'is', null)
  .limit(1)
  .maybeSingle();
```

A instância "WhatsApp Suporte" satisfaz todos os critérios, mesmo com dados fictícios.

---

## Solução

### Opção 1: Limpar Dados Fictícios (Recomendado)

Executar uma migração SQL para deletar as instâncias de teste:

```sql
-- Deletar instâncias com credenciais fictícias
DELETE FROM instances 
WHERE external_instance_id IN ('ext_uvw456', 'ext_xyz789')
   OR external_instance_token IN ('token_def456', 'token_ghi789', 'token_abc123');
```

**IDs a serem removidos:**
- `f07ad525-ab6d-4e48-99c1-28209b9353ea`
- `7bbec8f1-4256-4655-baa4-074e5658564f`
- `df80f647-922a-424e-b659-7f69521f2fe7`

### Opção 2: Filtro Adicional na Edge Function

Adicionar validação para rejeitar credenciais que parecem fictícias:

```typescript
// Após buscar a instância, validar credenciais
if (instance.external_instance_id.startsWith('ext_') || 
    instance.external_instance_token.startsWith('token_')) {
  console.error('[phone-validation] Instance has mock credentials');
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: 'INSTANCE_MOCK_CREDENTIALS',
        message: 'A instância encontrada possui credenciais de teste.'
      }
    }),
    { status: 503, ... }
  );
}
```

---

## Recomendação

**Opção 1 é a melhor escolha** - limpar os dados fictícios resolve o problema na raiz e evita processamento desnecessário.

---

## Ações

| Ação | Descrição |
|------|-----------|
| 1. Migração SQL | Deletar instâncias fictícias do banco |
| 2. Verificação | Confirmar que apenas instâncias reais permanecem |
| 3. Teste | Validar que phone-validation usa instância correta |

---

## Resultado Esperado

Após a limpeza, a Edge Function irá selecionar automaticamente uma das instâncias reais:
- **Mauro** (`3E249F618B74B1ABEF461664B40E8DC7`)
- **Tablet Estevão** (`3E2538077560F1BDA48C1664B40E8DC7`)

O payload enviado ao webhook n8n terá credenciais reais do Z-API.

