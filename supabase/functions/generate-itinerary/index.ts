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
    const { destination, days, travelers, vibe, extraPrompt } = await req.json();

    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not set.");

    const prompt = `You are an expert travel planner. Create a ${days}-day itinerary for ${destination} for a group of ${travelers} people. The group vibe is "${vibe}".
    Ensure that the itinerary is logically sequenced. Places to visit that are geographically close to each other should be visited on the same day to minimize travel time. Incorporate popular, well-known combinations of sites if applicable.
    ${extraPrompt ? `The user has carefully provided some extra requests and comments for this itinerary: "${extraPrompt}". Please accommodate these instructions in your plan.` : ""}
    Provide a highly detailed and inspiring day-by-day itinerary.
    For each day, provide a flexible number of activities depending on the vibe (e.g., more for adventure, fewer for relaxed). Instead of rigid morning/afternoon/evening blocks, use custom natural time strings (e.g., '10:00 AM', 'Lunch', 'Late Afternoon', or '9:30 AM - 1:00 PM') for the 'time_block' field.
    Output EXACTLY a JSON object with a single key "itinerary" containing an array of daily itinerary items.
    The JSON structure MUST MATCH EXACTLY this TypeScript type:
    
    type Activity = {
      time_block: string;
      activity_name: string;
      description: string;
      estimated_duration: string;
      estimated_cost: string;
      location: string;
    }
    type Day = {
      day_number: number;
      activities: Activity[];
    }
    type Response = { itinerary: Day[] };
    
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
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(errorData);
      throw new Error("Groq API Error");
    }

    const data = await response.json();
    let textOutput = data.choices[0].message.content;
    
    // Strip markdown code blocks if the model wrapped the JSON
    if (textOutput.startsWith('\`\`\`')) {
      textOutput = textOutput.replace(/^\`\`\`(json)?\\s*/i, '').replace(/\\s*\`\`\`$/, '');
    }
    
    const parsed = JSON.parse(textOutput);

    return new Response(JSON.stringify(parsed.itinerary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
