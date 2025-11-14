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
    const { resumeId } = await req.json();
    
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

    // Download PDF from storage
    const { data: fileData, error: downloadError } = await supabaseClient
      .storage
      .from('resumes')
      .download(resume.file_url);

    if (downloadError) throw downloadError;

    // Convert blob to base64 for AI processing (chunk to avoid stack overflow)
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let base64 = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      base64 += String.fromCharCode.apply(null, Array.from(chunk));
    }
    base64 = btoa(base64);

    // Use Lovable AI to parse resume and extract information
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    const parseResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
            content: 'You are a resume parser. Extract key information from resumes and return structured JSON data with skills, experience, and education.'
          },
          {
            role: 'user',
            content: `Parse this resume and extract:
1. Technical skills (programming languages, frameworks, tools)
2. Work experience (companies, roles, years)
3. Education (degrees, institutions)
4. Key projects or achievements

Return ONLY valid JSON in this format:
{
  "skills": ["skill1", "skill2"],
  "experience": ["Company - Role - Duration"],
  "education": ["Degree - Institution - Year"],
  "summary": "Brief professional summary"
}

Note: This is a PDF file, so extract text content first, then parse it.`
          }
        ],
      }),
    });

    const parseData = await parseResponse.json();
    let parsedContent;
    
    try {
      const content = parseData.choices[0].message.content;
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\{[\s\S]*\}/);
      parsedContent = JSON.parse(jsonMatch ? jsonMatch[1] || jsonMatch[0] : content);
    } catch (e) {
      console.error('Failed to parse AI response:', e);
      parsedContent = {
        skills: [],
        experience: [],
        education: [],
        summary: 'Unable to parse resume content'
      };
    }

    // Update resume with parsed data
    const { error: updateError } = await supabaseClient
      .from('resumes')
      .update({ parsed_data: parsedContent })
      .eq('id', resumeId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true, parsedData: parsedContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error parsing resume:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});