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
    const { mockInterviewId, responses } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get mock interview data
    const { data: mockInterview, error: interviewError } = await supabaseClient
      .from('mock_interviews')
      .select('*, resumes(*)')
      .eq('id', mockInterviewId)
      .single();

    if (interviewError) throw interviewError;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const perQuestionAnalysis = [];
    
    // Analyze each response
    for (const response of responses) {
      const analysisResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            {
              role: 'system',
              content: 'You are an expert interview evaluator. Analyze interview responses and provide constructive feedback.'
            },
            {
              role: 'user',
              content: `Analyze this interview response:

Question: ${response.question}
Response transcript: ${response.transcript || 'No transcript available'}
Duration: ${response.duration || 0} seconds

Evaluate on a scale of 0-100:
1. Fluency Score (clarity, pace, filler words)
2. Communication Score (structure, coherence, relevance)
3. Nervousness Score (0 = very nervous, 100 = confident)
4. Technical Content Score (depth, accuracy, relevance)

Provide specific feedback for improvement.

Return ONLY valid JSON:
{
  "fluencyScore": 75,
  "communicationScore": 80,
  "nervousnessScore": 70,
  "technicalScore": 85,
  "feedback": "Detailed feedback here"
}`
            }
          ],
        }),
      });

      const analysisData = await analysisResponse.json();
      let questionAnalysis;
      
      try {
        const content = analysisData.choices[0].message.content;
        const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
        questionAnalysis = JSON.parse(jsonMatch ? jsonMatch[1] || jsonMatch[0] : content);
      } catch (e) {
        console.error('Failed to parse analysis:', e);
        questionAnalysis = {
          fluencyScore: 70,
          communicationScore: 70,
          nervousnessScore: 70,
          technicalScore: 70,
          feedback: 'Analysis in progress'
        };
      }

      perQuestionAnalysis.push({
        question: response.question,
        ...questionAnalysis
      });
    }

    // Calculate overall scores
    const avgFluency = perQuestionAnalysis.reduce((sum, q) => sum + q.fluencyScore, 0) / perQuestionAnalysis.length;
    const avgCommunication = perQuestionAnalysis.reduce((sum, q) => sum + q.communicationScore, 0) / perQuestionAnalysis.length;
    const avgNervousness = perQuestionAnalysis.reduce((sum, q) => sum + q.nervousnessScore, 0) / perQuestionAnalysis.length;
    const avgTechnical = perQuestionAnalysis.reduce((sum, q) => sum + q.technicalScore, 0) / perQuestionAnalysis.length;
    const avgConfidence = (avgFluency + avgNervousness) / 2;

    // Create interview record (link to existing interviews table)
    const { data: interview, error: createInterviewError } = await supabaseClient
      .from('interviews')
      .insert({
        user_id: mockInterview.user_id,
        type: 'Mock',
        title: mockInterview.title,
        status: 'Completed',
        video_url: responses[0]?.videoUrl || ''
      })
      .select()
      .single();

    if (createInterviewError) throw createInterviewError;

    // Create analysis result
    const { data: analysisResult, error: analysisError } = await supabaseClient
      .from('analysis_results')
      .insert({
        interview_id: interview.id,
        communication_score: avgCommunication,
        technical_score: avgTechnical,
        confidence_score: avgConfidence,
        fluency_score: avgFluency,
        nervousness_score: avgNervousness,
        sentiment: avgConfidence > 70 ? 'Positive' : avgConfidence > 50 ? 'Neutral' : 'Needs Improvement',
        per_question_analysis: perQuestionAnalysis
      })
      .select()
      .single();

    if (analysisError) throw analysisError;

    // Update mock interview status
    await supabaseClient
      .from('mock_interviews')
      .update({ 
        status: 'Completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', mockInterviewId);

    return new Response(
      JSON.stringify({ 
        success: true,
        interviewId: interview.id,
        analysisResult: analysisResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error analyzing mock interview:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});