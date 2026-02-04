
# Plano: Criar Endpoint call-dial para Iniciar Ligacoes

Criar uma Edge Function para iniciar ligacoes telefonicas via API. O n8n chama esse endpoint, o DispatchOne registra e dispara a ligacao via API4com.

---

## Visao Geral

| Item | Descricao |
|------|-----------|
| Endpoint | POST `/call-dial` |
| Autenticacao | Bearer Token (API Key) |
| Funcao | Iniciar ligacao buscando campanha por nome |

---

## Arquivos a Criar/Modificar

| Arquivo | Acao |
|---------|------|
| `supabase/functions/call-dial/index.ts` | Criar nova Edge Function |
| `supabase/config.toml` | Adicionar configuracao da funcao |
| `src/data/api-endpoints.ts` | Adicionar documentacao do endpoint |

---

## Logica do Endpoint

```text
POST /call-dial
      |
      v
[Valida API Key]
      |
      v
[Busca campanha por nome]
      |--- Nao encontrada: 404 campaign_not_found
      |--- Inativa: 400 campaign_inactive
      v
[Busca/cria lead por telefone]
      |--- status=completed: 400 lead_already_completed
      |--- status=calling: 400 lead_already_calling
      v
[Busca operador ativo da campanha]
      |--- Nenhum: 400 no_operator_available
      v
[Cria registro em call_logs (status=dialing)]
      |
      v
[Atualiza lead para status=calling]
      |
      v
[Retorna sucesso com dados da ligacao]
```

---

## Payload de Entrada

```json
{
  "campaign_name": "FN | Carrinho Abandonado",
  "lead_phone": "5512983195531",
  "lead_name": "Ebonocleiton"
}
```

| Campo | Tipo | Obrigatorio | Descricao |
|-------|------|-------------|-----------|
| campaign_name | string | Sim | Nome exato da campanha de ligacao |
| lead_phone | string | Sim | Telefone do lead com DDI (min 10 digitos) |
| lead_name | string | Nao | Nome do lead para identificacao |

---

## Respostas

**Sucesso (201):**
```json
{
  "success": true,
  "call_id": "uuid-da-ligacao",
  "status": "dialing",
  "campaign": {
    "id": "uuid-da-campanha",
    "name": "FN | Carrinho Abandonado"
  },
  "lead": {
    "id": "uuid-do-lead",
    "phone": "5512983195531",
    "name": "Ebonocleiton"
  },
  "operator": {
    "id": "uuid-do-operador",
    "name": "Joao Silva",
    "extension": "1001"
  }
}
```

**Erros:**
- 404: `campaign_not_found` - Campanha nao encontrada
- 400: `campaign_inactive` - Campanha inativa (status != active)
- 400: `lead_already_completed` - Lead ja concluido
- 400: `lead_already_calling` - Lead em ligacao ativa
- 400: `no_operator_available` - Sem operador ativo na campanha
- 400: `invalid_phone` - Formato de telefone invalido
- 401: `UNAUTHORIZED` - Token ausente ou invalido

---

## Detalhes Tecnicos

### Edge Function (call-dial/index.ts)

1. **Autenticacao**: Reutilizar padrao de validacao de API Key (hash SHA-256)
2. **Busca Campanha**: Query em `call_campaigns` por `name` e status `active`
3. **Busca/Cria Lead**: Upsert em `call_leads` por `phone` + `campaign_id`
4. **Busca Operador**: Query em `call_campaign_operators` por `campaign_id` e `is_active=true`
5. **Cria Log**: Insert em `call_logs` com `status=dialing`
6. **Atualiza Lead**: Update status para `calling`
7. **Logging**: Registrar em `api_logs` para auditoria

### Configuracao (config.toml)

```toml
[functions.call-dial]
verify_jwt = false
```

### Documentacao (api-endpoints.ts)

Nova categoria "Ligacoes" com endpoint `call-dial` incluindo:
- Atributos com tipos e descricoes
- Exemplos em cURL, Node.js e Python
- Respostas de sucesso e erro

---

## Tabelas Envolvidas

| Tabela | Operacao |
|--------|----------|
| api_keys | SELECT (validar token) |
| call_campaigns | SELECT (buscar por nome) |
| call_leads | SELECT/INSERT (buscar ou criar lead) |
| call_campaign_operators | SELECT (buscar operador ativo) |
| call_logs | INSERT (registrar ligacao) |
| api_logs | INSERT (auditoria) |

---

## Observacoes

- Integracao com API4com sera implementada posteriormente
- Por enquanto o endpoint apenas registra a ligacao no banco
- O operador e selecionado automaticamente (primeiro ativo da campanha)
- Validacao de telefone: minimo 10 digitos (DDI + numero)
