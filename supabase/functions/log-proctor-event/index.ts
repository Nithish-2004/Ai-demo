import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { mockInterviewId, eventType, details, evidenceUrl, violationIncrement, currentCount } = await req.json();

    // Insert proctoring log with violation tracking
    const { error: logError } = await supabaseClient
      .from('proctoring_logs')
      .insert({
        mock_interview_id: mockInterviewId,
        event_type: eventType,
        details: details,
        evidence_url: evidenceUrl,
        violation_increment: violationIncrement || 0,
        current_count: currentCount || 0,
        timestamp: new Date().toISOString()
      });

    if (logError) throw logError;

    // Update mock interview violation count
    if (violationIncrement && violationIncrement > 0) {
      const { error: updateError } = await supabaseClient
        .from('mock_interviews')
        .update({ 
          violation_count: currentCount 
        })
        .eq('id', mockInterviewId);

      if (updateError) throw updateError;
    }

    // If it's a termination event or violation limit exceeded, update status
    if (eventType === 'session_terminated') {
      const { data: interview } = await supabaseClient
        .from('mock_interviews')
        .select('violation_count, violation_limit')
        .eq('id', mockInterviewId)
        .single();

      const integrityStatus = interview && interview.violation_count > interview.violation_limit
        ? 'Failed - Malpractice Exceeded Limit'
        : 'Failed - Malpractice';

      await supabaseClient
        .from('mock_interviews')
        .update({ 
          integrity_status: integrityStatus,
          status: 'Terminated'
        })
        .eq('id', mockInterviewId);
    }

    return new Response(
      JSON.stringify({ success: true, currentCount }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error logging proctor event:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
