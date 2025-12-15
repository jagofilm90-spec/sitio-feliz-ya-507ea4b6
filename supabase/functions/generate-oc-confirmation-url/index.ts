import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HMAC-SHA256 signing
async function hmacSha256(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);
  
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', key, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { ordenId, action, entregas, expirationDays = 30 } = await req.json();

    if (!ordenId || !action) {
      return new Response(
        JSON.stringify({ error: "ordenId and action are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const confirmationSecret = Deno.env.get("OC_CONFIRMATION_SECRET");
    if (!confirmationSecret) {
      console.error("OC_CONFIRMATION_SECRET not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    
    // Calculate expiration timestamp (Unix timestamp in seconds)
    const expiresAt = Math.floor(Date.now() / 1000) + (expirationDays * 24 * 60 * 60);
    
    // Build the message to sign
    let messageToSign = `${ordenId}:${action}:${expiresAt}`;
    if (action === 'confirm-entregas' && entregas && entregas.length > 0) {
      messageToSign += `:${entregas.join(',')}`;
    }
    
    // Generate HMAC signature
    const signature = await hmacSha256(confirmationSecret, messageToSign);
    
    // Build URL with query parameters
    const url = new URL(`${supabaseUrl}/functions/v1/confirmar-oc`);
    url.searchParams.set('id', ordenId);
    url.searchParams.set('action', action);
    url.searchParams.set('exp', expiresAt.toString());
    url.searchParams.set('sig', signature);
    
    if (action === 'confirm-entregas' && entregas && entregas.length > 0) {
      url.searchParams.set('entregas', entregas.join(','));
    }

    console.log(`Generated signed URL for OC ${ordenId}, action: ${action}, expires: ${new Date(expiresAt * 1000).toISOString()}`);

    return new Response(
      JSON.stringify({ url: url.toString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating signed URL:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate URL" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
