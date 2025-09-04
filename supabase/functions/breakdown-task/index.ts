import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { task, context } = await req.json();

    if (!task || task.trim().length === 0) {
      throw new Error('Task is required');
    }

    console.log('Breaking down task:', task);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a task breakdown assistant that creates simple, bite-sized subtasks for neurodivergent individuals (especially those with ADHD).

RULES:
1. Break the task into EXACTLY 3 subtasks (only use 4-5 if the task is genuinely complex and 3 would be insufficient)
2. Each subtask should be 6-10 words maximum - keep it brief!
3. Use simple, everyday language - avoid jargon or complexity
4. Focus on the most essential actions only - skip minor details
5. Start each subtask with a clear action verb
6. Make steps feel quick and achievable, not overwhelming
7. Prefer 3 subtasks over 4 or 5 - only expand if absolutely necessary
8. Return ONLY a JSON object with this structure:

{
  "subtasks": [
    {"subtask": "short, simple action"},
    {"subtask": "another brief action"},
    ...
  ],
  "breakdown_rationale": "Brief explanation of the approach taken"
}

REMEMBER: Keep it simple and concise - think Google Docs checklist, not detailed project plan!

Context: ${context || "General task breakdown for productivity optimization"}`
          },
          {
            role: 'user',
            content: `Break down this task: "${task}"`
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]) {
      throw new Error('Invalid response from OpenAI');
    }

    const breakdown = JSON.parse(data.choices[0].message.content);
    console.log('Generated breakdown:', breakdown);

    return new Response(JSON.stringify(breakdown), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Task breakdown error:', error);
    
    return new Response(JSON.stringify({
      error: error.message || 'Failed to breakdown task',
      details: 'Unable to generate subtasks at this time'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});