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
    const { resumeId, userId } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get resume data
    const { data: resume, error: resumeError } = await supabaseClient
      .from('resumes')
      .select('*')
      .eq('id', resumeId)
      .single();

    if (resumeError) throw resumeError;

    const parsedData = resume.parsed_data || {};
    
    // Use Lovable AI to generate personalized interview questions
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: 'You are an expert technical interviewer. Generate personalized interview questions based on a candidate\'s resume.'
          },
          {
            role: 'user',
            content: `Based on this resume information, generate 12 interview questions:

Resume Summary:
- Skills: ${parsedData.skills?.join(', ') || 'General skills'}
- Experience: ${parsedData.experience?.join(', ') || 'General experience'}
- Education: ${parsedData.education?.join(', ') || 'General education'}

Generate:
1. One self-introduction question
2. Ten diverse technical and behavioral questions based on their skills and experience:
   - 4 technical questions about specific skills they mentioned
   - 3 behavioral questions about past experiences and challenges
   - 2 problem-solving/scenario-based questions
   - 1 question about teamwork/collaboration
3. One closing question about goals/motivation

Return ONLY valid JSON array in this format:
[
  {
    "id": 1,
    "question": "Tell me about yourself and your background.",
    "type": "introduction",
    "timeLimit": 120
  },
  ...
]

Each question should have: id (number), question (string), type (string), and timeLimit in seconds (120-180). Make questions specific and relevant to their resume.`
          }
        ],
      }),
    });

    const data = await response.json();
    let questions;
    
    try {
      const content = data.choices[0].message.content;
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\[[\s\S]*\]/);
      questions = JSON.parse(jsonMatch ? jsonMatch[1] || jsonMatch[0] : content);
    } catch (e) {
      console.error('Failed to parse questions:', e);
      // Fallback questions
      questions = [
        { id: 1, question: "Tell me about yourself and your professional background.", type: "introduction", timeLimit: 120 },
        { id: 2, question: "What are your strongest technical skills and how have you applied them?", type: "technical", timeLimit: 150 },
        { id: 3, question: "Describe a challenging technical problem you solved recently.", type: "technical", timeLimit: 180 },
        { id: 4, question: "Walk me through your approach to debugging complex issues.", type: "technical", timeLimit: 150 },
        { id: 5, question: "What technologies or frameworks are you most proficient in?", type: "technical", timeLimit: 150 },
        { id: 6, question: "Describe a time when you had to learn a new technology quickly.", type: "behavioral", timeLimit: 180 },
        { id: 7, question: "Tell me about a project where you had to overcome significant obstacles.", type: "behavioral", timeLimit: 180 },
        { id: 8, question: "How do you handle conflicting priorities and tight deadlines?", type: "behavioral", timeLimit: 150 },
        { id: 9, question: "If given a system design problem, how would you approach it?", type: "problem-solving", timeLimit: 180 },
        { id: 10, question: "Describe a scenario where you had to make a technical trade-off decision.", type: "problem-solving", timeLimit: 150 },
        { id: 11, question: "How do you collaborate with team members who have different technical backgrounds?", type: "teamwork", timeLimit: 150 },
        { id: 12, question: "What are your career goals and what motivates you professionally?", type: "closing", timeLimit: 120 }
      ];
    }

    // Create mock interview record
    const { data: mockInterview, error: createError } = await supabaseClient
      .from('mock_interviews')
      .insert({
        user_id: userId,
        resume_id: resumeId,
        status: 'In Progress',
        title: `Mock Interview - ${new Date().toLocaleDateString()}`,
        questions: questions
      })
      .select()
      .single();

    if (createError) throw createError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        mockInterviewId: mockInterview.id,
        questions: questions 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating questions:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});