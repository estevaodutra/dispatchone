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

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract Bearer token from Authorization header
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({
          valid: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Token de autenticação ausente ou inválido.'
          }
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Validate token format (should start with pk_live_ or pk_test_)
    if (!token.startsWith('pk_live_') && !token.startsWith('pk_test_')) {
      console.log('Invalid token format');
      return new Response(
        JSON.stringify({
          valid: false,
          error: {
            code: 'INVALID_TOKEN_FORMAT',
            message: 'Formato do token inválido.'
          }
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Hash the token for lookup
    const tokenHash = await hashToken(token);

    // Look up the API key by hash
    const { data: apiKey, error: lookupError } = await supabase
      .from('api_keys')
      .select('id, name, environment, revoked_at, created_at')
      .eq('key_hash', tokenHash)
      .single();

    if (lookupError || !apiKey) {
      console.log('API key not found:', lookupError?.message);
      return new Response(
        JSON.stringify({
          valid: false,
          error: {
            code: 'INVALID_API_KEY',
            message: 'API key inválida ou não encontrada.'
          }
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if the key has been revoked
    if (apiKey.revoked_at) {
      console.log('API key has been revoked');
      return new Response(
        JSON.stringify({
          valid: false,
          error: {
            code: 'API_KEY_REVOKED',
            message: 'Esta API key foi revogada.'
          }
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Update last_used_at timestamp
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKey.id);

    console.log('API key validated successfully:', apiKey.name);

    return new Response(
      JSON.stringify({
        valid: true,
        apiKey: {
          id: apiKey.id,
          name: apiKey.name,
          environment: apiKey.environment,
          createdAt: apiKey.created_at
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error validating API key:', error);
    return new Response(
      JSON.stringify({
        valid: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erro interno ao validar API key.'
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
