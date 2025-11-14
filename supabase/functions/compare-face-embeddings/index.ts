import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.74.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { currentEmbedding, mockInterviewId } = await req.json();

    if (!currentEmbedding || !mockInterviewId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the mock interview to find the user
    const { data: interview, error: interviewError } = await supabase
      .from("mock_interviews")
      .select("user_id")
      .eq("id", mockInterviewId)
      .single();

    if (interviewError || !interview) {
      return new Response(
        JSON.stringify({ error: "Interview not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the stored face embedding from the profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("face_embedding")
      .eq("id", interview.user_id)
      .single();

    if (profileError || !profile || !profile.face_embedding) {
      return new Response(
        JSON.stringify({ error: "No stored face embedding found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const storedEmbedding = profile.face_embedding as number[];

    // Calculate Euclidean distance between embeddings
    const distance = euclideanDistance(currentEmbedding, storedEmbedding);
    
    // Threshold for face match (lower is better, typical threshold is 0.6)
    const threshold = 0.6;
    const isMatch = distance < threshold;

    console.log(`Face comparison - Distance: ${distance}, Match: ${isMatch}`);

    return new Response(
      JSON.stringify({ 
        isMatch,
        distance,
        threshold 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error comparing face embeddings:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function euclideanDistance(arr1: number[], arr2: number[]): number {
  if (arr1.length !== arr2.length) {
    throw new Error("Embeddings must have the same length");
  }
  
  let sum = 0;
  for (let i = 0; i < arr1.length; i++) {
    sum += Math.pow(arr1[i] - arr2[i], 2);
  }
  return Math.sqrt(sum);
}
