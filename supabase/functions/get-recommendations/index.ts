import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query, destination, vibe } = await req.json();

    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not set.");

    const prompt = `You are an expert local guide. Search for and recommend places based on this query: "${query}" in "${destination}". The user vibe is "${vibe}".
    Provide exactly 6 high-quality recommendations. Include a mix of popular places and at least 2 "hidden gems".
    You MUST output EXACTLY a JSON object with a single key "recommendations" containing an array matching this TypeScript type:
    type Recommendation = {
      name: string;
      description: string;
      type: string; // e.g. 'restaurant', 'attraction'
      rating?: number; // e.g. 4.5
      address?: string; // street address if available
      isHiddenGem: boolean; // set to true for the hidden gems
      reason: string; // why you recommend it for the "${vibe}" vibe
    }
    
    Return ONLY a JSON object.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.4,
      })
    });

    if (!response.ok) {
      const errTxt = await response.text();
      console.error(errTxt);
      throw new Error("API Error");
    }

    const data = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content);

    return new Response(JSON.stringify(parsed.recommendations), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
  }
});
