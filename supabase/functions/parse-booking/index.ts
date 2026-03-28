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
    const { email } = await req.json();

    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not set.");

    const prompt = `You are an AI assistant that extracts travel booking information from confirmation emails.
    Read the following email text and extract these details into a JSON object:
    - type: one of ['flight', 'hotel', 'tour', 'restaurant', 'other'] (guess based on content)
    - title: A short description like "Delta Flight DL123" or "Hilton Hotel"
    - start_datetime: ISO8601 string if a start date/time is found, otherwise null
    - end_datetime: ISO8601 string if an end date/time is found, otherwise null
    - confirmation_number: The booking/confirmation reference string, or null
    - cost: numerical value extracted if a total cost is found, otherwise null
    
    Email text:
    """
    ${email}
    """

    Return ONLY a JSON object exactly matching the keys above.`;

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
        temperature: 0,
      })
    });

    if (!response.ok) throw new Error("API Error");

    const data = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content);

    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
  }
});
