import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { otp } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabaseClient.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    // Find latest OTP for user
    const { data: logs, error } = await supabaseClient
      .from('verification_logs')
      .select('*')
      .eq('user_id', user.id)
      .eq('verification_type', 'email_otp')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !logs || logs.length === 0) {
      throw new Error('No pending verification found');
    }

    const log = logs[0];
    const storedOtp = log.details.otp;
    const expiresAt = new Date(log.details.expires_at);

    if (new Date() > expiresAt) {
      throw new Error('OTP expired');
    }

    if (otp !== storedOtp) {
      throw new Error('Invalid OTP');
    }

    // Mark as verified
    await supabaseClient
      .from('verification_logs')
      .update({ status: 'verified' })
      .eq('id', log.id);

    return new Response(
      JSON.stringify({ success: true, message: 'OTP verified successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});