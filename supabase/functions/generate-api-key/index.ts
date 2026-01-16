import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Generate a secure random token
function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Hash a string using SHA-256
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (req.method === 'POST') {
      const { name, environment = 'production' } = await req.json();

      if (!name) {
        return new Response(
          JSON.stringify({ error: 'Name is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate the full API key
      const prefix = environment === 'production' ? 'pk_live_' : 'pk_test_';
      const token = generateSecureToken(32);
      const fullKey = `${prefix}${token}`;
      const lastFour = token.slice(-4);

      // Hash the full key for storage
      const keyHash = await hashToken(fullKey);

      console.log(`Generating API key for: ${name}, environment: ${environment}`);

      // Store in database
      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          name,
          key_prefix: prefix,
          key_hash: keyHash,
          last_four: lastFour,
          environment,
        })
        .select()
        .single();

      if (error) {
        console.error('Error inserting API key:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to create API key' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`API key created successfully: ${data.id}`);

      // Return the full key ONLY once
      return new Response(
        JSON.stringify({
          success: true,
          key: fullKey,
          id: data.id,
          name: data.name,
          environment: data.environment,
          created_at: data.created_at,
          message: 'Save this key securely. It will not be shown again.',
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'GET') {
      // List all API keys (without the actual key values)
      const { data, error } = await supabase
        .from('api_keys')
        .select('id, name, key_prefix, last_four, environment, created_at, last_used_at, revoked_at')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching API keys:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch API keys' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ keys: data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'DELETE') {
      const { id } = await req.json();

      if (!id) {
        return new Response(
          JSON.stringify({ error: 'Key ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Soft delete by setting revoked_at
      const { error } = await supabase
        .from('api_keys')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Error revoking API key:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to revoke API key' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`API key revoked: ${id}`);

      return new Response(
        JSON.stringify({ success: true, message: 'API key revoked successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});