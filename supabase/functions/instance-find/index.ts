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

// Validate API key and return the key info if valid
async function validateApiKey(supabase: any, authHeader: string | null): Promise<{ valid: boolean; error?: string; apiKey?: any }> {
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
    .select('id, name, environment, revoked_at')
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

// Mock instances data - In production, this would come from a database table
const mockInstances = [
  {
    id: "inst_abc123",
    name: "WhatsApp Principal",
    phone: "5511999999999",
    status: "connected",
    provider: "evolution",
    externalInstanceId: "ext_xyz789",
    externalInstanceToken: "token_abc123",
    createdAt: "2024-01-15T08:00:00Z",
    lastMessageAt: "2024-01-15T11:30:00Z",
    messagesCount: 1542
  },
  {
    id: "inst_def456",
    name: "WhatsApp Suporte",
    phone: "5511988888888",
    status: "connected",
    provider: "z-api",
    externalInstanceId: "ext_uvw456",
    externalInstanceToken: "token_def456",
    createdAt: "2024-01-10T10:00:00Z",
    lastMessageAt: "2024-01-15T10:00:00Z",
    messagesCount: 892
  },
  {
    id: "inst_ghi789",
    name: "WhatsApp Vendas",
    phone: "5521977777777",
    status: "disconnected",
    provider: "evolution",
    externalInstanceId: "ext_rst123",
    externalInstanceToken: "token_ghi789",
    createdAt: "2024-01-05T14:00:00Z",
    lastMessageAt: "2024-01-14T16:45:00Z",
    messagesCount: 2341
  }
];

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'METHOD_NOT_ALLOWED',
          message: 'Apenas requisições GET são permitidas.'
        }
      }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
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
      console.log('Authentication failed:', authResult.error);
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: authResult.error
          }
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse query parameters
    const url = new URL(req.url);
    const instanceId = url.searchParams.get('instanceId');
    const phone = url.searchParams.get('phone');
    const externalInstanceId = url.searchParams.get('externalInstanceId');
    const externalInstanceToken = url.searchParams.get('externalInstanceToken');

    console.log('Search params:', { instanceId, phone, externalInstanceId, externalInstanceToken });

    // Check if at least one search parameter is provided
    if (!instanceId && !phone && !externalInstanceId && !externalInstanceToken) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'MISSING_PARAMETER',
            message: 'Forneça pelo menos um parâmetro de busca: instanceId, phone, externalInstanceId ou externalInstanceToken.'
          }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Search for the instance
    let foundInstance = null;

    if (instanceId) {
      foundInstance = mockInstances.find(inst => inst.id === instanceId);
    } else if (phone) {
      foundInstance = mockInstances.find(inst => inst.phone === phone);
    } else if (externalInstanceId) {
      foundInstance = mockInstances.find(inst => inst.externalInstanceId === externalInstanceId);
    } else if (externalInstanceToken) {
      foundInstance = mockInstances.find(inst => inst.externalInstanceToken === externalInstanceToken);
    }

    if (!foundInstance) {
      console.log('Instance not found');
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'INSTANCE_NOT_FOUND',
            message: 'Instância não encontrada.'
          }
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Instance found:', foundInstance.id);

    // Return the found instance (excluding sensitive data like externalInstanceToken)
    return new Response(
      JSON.stringify({
        success: true,
        instance: {
          id: foundInstance.id,
          name: foundInstance.name,
          phone: foundInstance.phone,
          status: foundInstance.status,
          provider: foundInstance.provider,
          externalInstanceId: foundInstance.externalInstanceId,
          createdAt: foundInstance.createdAt,
          lastMessageAt: foundInstance.lastMessageAt,
          messagesCount: foundInstance.messagesCount
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error finding instance:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno ao buscar instância.'
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
