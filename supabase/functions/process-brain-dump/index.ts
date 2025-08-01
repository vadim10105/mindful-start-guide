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
    const { brainDumpText, simplifyTasks, tasks } = await req.json();

    // Handle task simplification
    if (simplifyTasks && tasks) {
      console.log('Simplifying tasks:', tasks);
      
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
              content: `You are a task simplification assistant. Convert each task into a concise 2-word description suitable for a calendar timeline.

RULES:
1. Create exactly 2 words for each task
2. Use action words + object (e.g., "Email John", "Write Report", "Call Mom")
3. Keep the essence of the task but make it calendar-friendly
4. Return ONLY a JSON object mapping original task titles to simplified versions
5. Format: {"original task": "simplified version"}`
            },
            {
              role: 'user',
              content: `Simplify these tasks:\n${tasks.map((task: string) => `- ${task}`).join('\n')}`
            }
          ],
          temperature: 0.3,
          max_tokens: 1000,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error('OpenAI API error:', data);
        throw new Error(data.error?.message || 'Failed to simplify tasks');
      }

      const aiResponse = data.choices[0].message.content;
      console.log('AI simplification response:', aiResponse);

      let simplifiedTasks;
      try {
        const cleanedResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
        simplifiedTasks = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error('Failed to parse AI response:', aiResponse);
        throw new Error('Failed to parse simplified tasks');
      }

      return new Response(JSON.stringify({ simplifiedTasks }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle brain dump processing (existing functionality)
    if (!brainDumpText || brainDumpText.trim().length === 0) {
      throw new Error('Brain dump text is required');
    }

    console.log('Processing brain dump:', brainDumpText);

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
            content: `You are a task organization assistant. Your job is to take unstructured brain dump text and extract discrete, actionable tasks from it.

RULES:
1. Extract only actionable tasks - ignore thoughts, notes, or non-actionable items
2. Each task should be a single, clear action
3. Make tasks specific and actionable (e.g., "Email John about the meeting" not "John meeting")
4. If a complex item has multiple steps, break it into separate tasks
5. PRESERVE THE ORIGINAL ORDER - extract tasks in the same sequence they appear in the text
6. Return ONLY a JSON array of task objects
7. Each task object should have: {"title": "task description", "estimated_time": "time estimate using 'm' and 'h' (e.g., '15m', '2h', '1h 30m')"}`
          },
          {
            role: 'user',
            content: brainDumpText
          }
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI API error:', data);
      throw new Error(data.error?.message || 'Failed to process brain dump');
    }

    const aiResponse = data.choices[0].message.content;
    console.log('AI response:', aiResponse);

    // Parse the JSON response from AI
    let extractedTasks;
    try {
      // Clean up the response in case it has markdown formatting
      const cleanedResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
      extractedTasks = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      throw new Error('Failed to parse extracted tasks');
    }

    // Validate the response structure
    if (!Array.isArray(extractedTasks)) {
      throw new Error('Invalid response format from AI');
    }

    console.log('Extracted tasks:', extractedTasks);

    return new Response(JSON.stringify({ tasks: extractedTasks }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-brain-dump function:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to process brain dump text'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});