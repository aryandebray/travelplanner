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
    const { message, history, context, pageData } = await req.json();

    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not set.");

    const systemPrompt = `You are Scout, a helpful AI travel co-pilot for the "Atlas" travel planning app.
You are currently on the "${context}" page.

${pageData ? `Here is the current page data for context:\n${JSON.stringify(pageData, null, 2)}` : ''}

Your job:
- Answer questions about the user's trip data shown on this page.
- For the EXPENSES page: you can help analyze spending, suggest budgets, explain splits, and generate chart configurations.
- For the CALENDAR page: help with scheduling, identify conflicts, suggest optimal booking times.
- For the RECOMMENDATIONS page: suggest places, hidden gems, explain why a recommendation is good.

If the user asks you to generate a chart or graph, respond with:
1. A "message" field with a conversational text response.
2. A "structured" field containing a chart config object with:
   - "chartType": one of "pie", "bar", "line", "area"
   - "title": chart title
   - "data": array of objects with "name" and "value" keys
   - "colors": optional array of hex color strings

If the user does NOT ask for a chart, respond only with:
1. A "message" field with your text response.

ALWAYS return valid JSON with at least a "message" key. Do NOT wrap in markdown code blocks.`;

    const groqMessages: any[] = [{ role: "system", content: systemPrompt }];

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

    if (textOutput.startsWith('```')) {
      textOutput = textOutput.replace(/^```(json)?\s*/i, '').replace(/\s*```$/, '');
    }

    let parsed;
    try {
      parsed = JSON.parse(textOutput);
    } catch (e) {
      parsed = { message: textOutput };
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
