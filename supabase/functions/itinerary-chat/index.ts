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
    const { itinerary, message, history } = await req.json();

    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not set.");

    // Format chat history for Groq
    const groqMessages = [
      { 
        role: "system", 
        content: `You are an expert, friendly AI travel co-pilot. Your job is to help the user iteratively update their travel itinerary.
The user's current itinerary JSON is provided below. You must respond to the user's message and return a newly updated itinerary reflecting their requests.

Current Itinerary:
${JSON.stringify(itinerary)}

CRITICAL INSTRUCTIONS:
1. You MUST ALWAYS return EXACTLY a JSON object with two keys:
   - "message": A string containing a polite, conversational response to the user's request, telling them what you changed.
   - "itinerary": An array containing the FULL updated itinerary JSON object, preserving the existing structure (days containing activities).
2. If the user asks for a change (e.g., adding an activity, removing one, changing times), apply it to the "itinerary" array.
3. Replace the old "morning/afternoon/evening" time structure with custom approximate timings if the user asks, or continue using their format. Keep activities logically ordered.
4. Output NOTHING EXCEPT the JSON object. Do not wrap it in markdown block. Just the raw JSON.` 
      }
    ];

    if (history && Array.isArray(history)) {
      for (const msg of history) {
        if (msg.role === 'ai' || msg.role === 'user') {
          groqMessages.push({ role: msg.role === 'ai' ? 'assistant' : 'user', content: msg.content });
        }
      }
    }

    groqMessages.push({ role: "user", content: message });

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: groqMessages,
        response_format: { type: "json_object" },
        temperature: 0.5,
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
      textOutput = textOutput.replace(/^\`\`\`(json)?\s*/i, '').replace(/\s*\`\`\`$/, '');
    }
    
    let parsed;
    try {
      parsed = JSON.parse(textOutput);
    } catch(e) {
      throw new Error("Failed to parse JSON from AI response");
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
