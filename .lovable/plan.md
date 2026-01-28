

## Criar Endpoint de Validação de Número WhatsApp

### Visão Geral

Criar um novo endpoint `/phone-validation` que verifica se um número de telefone possui WhatsApp ativo, utilizando a API do Z-API. O sistema selecionará automaticamente uma instância conectada para fazer a consulta.

---

### Fluxo de Funcionamento

```text
Cliente                     dispatchOne                      Z-API
   │                             │                              │
   ├─► POST /phone-validation   │                              │
   │   { phone: "55119..." }    │                              │
   │                             │                              │
   │                             ├─► Buscar instância          │
   │                             │   conectada no DB           │
   │                             │                              │
   │                             ├─► GET phone-exists ────────►│
   │                             │                              │
   │                             │◄──── { exists, phone, lid } │
   │                             │                              │
   │◄──── { exists, phone }     │                              │
```

---

### Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/phone-validation/index.ts` | Edge Function que faz a validação |

---

### Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `supabase/config.toml` | Adicionar configuração da nova função |
| `src/data/api-endpoints.ts` | Adicionar documentação do endpoint |
| `src/components/api-docs/ApiSidebar.tsx` | Adicionar ícone para nova categoria |

---

### Detalhes da Edge Function

**Endpoint:** `POST /phone-validation`

**Request:**
```json
{
  "phone": "5512983195531"
}
```

**Lógica:**
1. Validar autenticação via API key (Bearer token)
2. Validar formato do phone (apenas números, mínimo 10 dígitos)
3. Buscar instância com `status = 'connected'` no banco
4. Se não houver instância conectada, retornar erro
5. Montar URL do Z-API: `https://api.z-api.io/instances/{external_instance_id}/token/{external_instance_token}/phone-exists/{phone}`
6. Fazer request GET para o Z-API
7. Retornar resultado formatado

**Response Sucesso (200):**
```json
{
  "success": true,
  "exists": true,
  "phone": "5512983195531",
  "lid": "999999999@lid",
  "instance_used": "Nome da Instância"
}
```

**Response Erro - Número sem WhatsApp (200):**
```json
{
  "success": true,
  "exists": false,
  "phone": "5512983195531",
  "lid": null
}
```

**Response Erro - Sem instância conectada (503):**
```json
{
  "success": false,
  "error": {
    "code": "NO_CONNECTED_INSTANCE",
    "message": "Nenhuma instância WhatsApp está conectada para fazer a validação."
  }
}
```

---

### Edge Function Code

```typescript
// supabase/functions/phone-validation/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Hash token using SHA-256
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Validate API key
async function validateApiKey(supabase: any, authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { valid: false, error: 'Token de autenticação ausente ou inválido.' };
  }

  const token = authHeader.replace('Bearer ', '');
  
  if (!token.startsWith('pk_live_') && !token.startsWith('pk_test_')) {
    return { valid: false, error: 'Formato do token inválido.' };
  }

  const tokenHash = await hashToken(token);

  const { data: apiKey, error } = await supabase
    .from('api_keys')
    .select('id, name, environment, revoked_at, user_id')
    .eq('key_hash', tokenHash)
    .maybeSingle();

  if (error || !apiKey) {
    return { valid: false, error: 'API key inválida ou não encontrada.' };
  }

  if (apiKey.revoked_at) {
    return { valid: false, error: 'Esta API key foi revogada.' };
  }

  // Update last_used_at
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', apiKey.id);

  return { valid: true, apiKey };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'METHOD_NOT_ALLOWED', message: 'Apenas POST é permitido.' }
      }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate API key
    const authHeader = req.headers.get('Authorization');
    const authResult = await validateApiKey(supabase, authHeader);

    if (!authResult.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'UNAUTHORIZED', message: authResult.error }
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await req.json();
    const { phone } = body;

    if (!phone) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'INVALID_PAYLOAD', message: 'O campo "phone" é obrigatório.' }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate phone format (only numbers, min 10 digits)
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: 'INVALID_PHONE', message: 'Número de telefone inválido. Use formato DDI+DDD+Número.' }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find a connected instance
    const { data: instance, error: instanceError } = await supabase
      .from('instances')
      .select('id, name, external_instance_id, external_instance_token')
      .eq('status', 'connected')
      .eq('user_id', authResult.apiKey.user_id)
      .limit(1)
      .maybeSingle();

    if (instanceError || !instance) {
      console.log('No connected instance found');
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'NO_CONNECTED_INSTANCE',
            message: 'Nenhuma instância WhatsApp está conectada para fazer a validação.'
          }
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!instance.external_instance_id || !instance.external_instance_token) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'INSTANCE_NOT_CONFIGURED',
            message: 'A instância conectada não possui credenciais do provedor configuradas.'
          }
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Z-API phone-exists endpoint
    const zapiUrl = `https://api.z-api.io/instances/${instance.external_instance_id}/token/${instance.external_instance_token}/phone-exists/${cleanPhone}`;
    
    console.log(`Calling Z-API for phone validation: ${cleanPhone}`);

    const zapiResponse = await fetch(zapiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!zapiResponse.ok) {
      console.error('Z-API error:', zapiResponse.status, await zapiResponse.text());
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'PROVIDER_ERROR',
            message: 'Erro ao consultar o provedor WhatsApp.'
          }
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const zapiData = await zapiResponse.json();
    
    // Z-API returns an array, get first result
    const result = Array.isArray(zapiData) ? zapiData[0] : zapiData;

    console.log('Z-API response:', result);

    return new Response(
      JSON.stringify({
        success: true,
        exists: result.exists === true || result.exists === 'true',
        phone: result.phone || cleanPhone,
        lid: result.lid || null,
        instance_used: instance.name
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error validating phone:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Erro interno ao validar número.' }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

### Documentação na API (api-endpoints.ts)

Nova categoria "Validação" com o endpoint `/phone-validation`:

```typescript
{
  id: "validation",
  name: "Validação",
  description: "Endpoints para validação de contatos",
  endpoints: [
    {
      id: "phone-validation",
      method: "POST",
      path: "/phone-validation",
      description: "Verifica se um número de telefone possui WhatsApp ativo. Utiliza automaticamente uma instância conectada para fazer a validação.",
      attributes: [
        {
          name: "phone",
          type: "string",
          required: true,
          description: "Número no formato DDI+DDD+Número (ex: 5511999999999). Apenas números."
        }
      ],
      // ... exemplos cURL, Node.js, Python
    }
  ]
}
```

---

### Atualização do Sidebar (ApiSidebar.tsx)

Adicionar ícone para a nova categoria:

```typescript
const categoryIcons: Record<string, React.ReactNode> = {
  // ... existentes
  validation: <CheckCircle className="h-4 w-4" />,
};
```

---

### Atualização do config.toml

```toml
[functions.phone-validation]
verify_jwt = false
```

---

### Resultado Esperado

1. Novo endpoint `/phone-validation` disponível na API
2. Documentação completa com exemplos em cURL, Node.js e Python
3. Validação automática usando instância conectada do usuário
4. Retorno padronizado com `exists`, `phone`, `lid` e `instance_used`

