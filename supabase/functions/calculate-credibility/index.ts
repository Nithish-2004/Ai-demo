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
    const { mockInterviewId } = await req.json();
    
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

    // Get interview data
    const { data: interview } = await supabaseClient
      .from('mock_interviews')
      .select('*, proctoring_logs(*), monitoring_flags(*)')
      .eq('id', mockInterviewId)
      .eq('user_id', user.id)
      .single();

    if (!interview) {
      throw new Error('Interview not found');
    }

    // Calculate credibility index
    let credibilityIndex = 100;
    
    // Deduct points based on violation types
    const criticalFlags = interview.monitoring_flags?.filter((f: any) => f.severity === 'critical') || [];
    const warningFlags = interview.monitoring_flags?.filter((f: any) => f.severity === 'warning') || [];
    
    credibilityIndex -= (criticalFlags.length * 15);
    credibilityIndex -= (warningFlags.length * 5);
    credibilityIndex -= (interview.violation_count * 10);
    
    // Ensure minimum score
    credibilityIndex = Math.max(0, credibilityIndex);

    // Update interview
    await supabaseClient
      .from('mock_interviews')
      .update({ credibility_index: credibilityIndex })
      .eq('id', mockInterviewId);

    // Generate summary
    const summary = {
      credibilityIndex,
      totalFlags: interview.monitoring_flags?.length || 0,
      criticalCount: criticalFlags.length,
      warningCount: warningFlags.length,
      violationCount: interview.violation_count,
      verificationStatus: interview.verification_status,
      integrityStatus: interview.integrity_status
    };

    return new Response(
      JSON.stringify({ success: true, credibility: summary }),
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