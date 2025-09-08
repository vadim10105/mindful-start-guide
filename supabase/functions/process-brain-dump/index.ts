import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { brainDumpText, simplifyTasks, tasks } = await req.json();

    if (simplifyTasks && tasks) {
      console.log('Simplifying tasks:', tasks);
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a task simplification assistant. Convert each task into a concise 2-word description suitable for a calendar timeline.

RULES:
1. Create exactly 2 words for each task
2. Use action words + object (e.g., "Email John", "Write Report")
3. Keep the essence but make it calendar-friendly
4. Return ONLY a JSON object mapping original to simplified
5. Format: {"original task": "simplified version"}`
            },
            {
              role: 'user',
              content: `Simplify these tasks:\n${tasks.map(t => `- ${t}`).join('\n')}`
            }
          ],
          temperature: 0.3,
          max_tokens: 1000
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Failed to simplify tasks');

      const cleaned = data.choices[0].message.content.replace(/```json\n?|\n?```/g, '').trim();
      const simplifiedTasks = JSON.parse(cleaned);

      return new Response(JSON.stringify({ simplifiedTasks }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!brainDumpText?.trim()) {
      throw new Error('Brain dump text is required');
    }

    console.log('Processing brain dump:', brainDumpText);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a task organization assistant specializing in extracting actionable tasks from unstructured brain dumps and random thoughts.

CORE MISSION:
Transform mental clutter into clear, specific, actionable tasks someone can start immediately.

EXTRACTION RULES:
1. Extract ONLY actionable tasks; ignore pure thoughts or notes.
2. Each task must be a single, clear action with a strong verb.
3. Break multi-step items into separate tasks.
4. PRESERVE ORIGINAL ORDER.
5. Return ONLY a JSON array of objects.

WORDING BEST PRACTICES:
- Start with a strong action verb (Send, Call, Schedule, Complete, Review, Research, Update, Create, Write, Book, Buy, Fix).
- Specify WHO and WHAT.
- Add WHY only if the purpose isn't obvious.
- When details are missing, make reasonable assumptions without over-interpreting.

NEXT-STEP CLARITY (only when obvious or mentioned):
If the context clearly indicates what the next physical action should be, make it specific:
- "Plan trip to Barcelona" → "Research train schedules for Barcelona" (if trains were mentioned)
- "Handle project" → Keep as-is unless specific next step is mentioned
- Only clarify when you can infer from the actual text, not from wild assumptions

PROGRESS MILESTONES (for tasks 2 hours or more):
Break down tasks that feel too big to start (2+ hours) into natural chunks:
- "Create presentation" (2h) → "Create presentation outline" (30m) + "Build presentation slides" (1h 30m)
- "Write blog post" (2h) → "Outline blog post" (30m) + "Draft blog post" (1h) + "Edit blog post" (30m)
- "Deep clean apartment" (3h) → "Clean kitchen and bathroom" (1h 30m) + "Clean bedrooms and living areas" (1h 30m)
- Keep natural breaking points that reduce friction to start
- Aim for bite-sized starting points (often 30m-1h) to build momentum

OUTCOME-ORIENTED LANGUAGE (only when context provides it):
Add outcomes only when they're mentioned or clearly implied:
- "Email Sarah about budget for Q4" → "Email Sarah about budget approval for Q4 funding"
- "Call dentist" → Keep as-is unless purpose was mentioned
- Don't invent outcomes that aren't in the original text

JSON FORMAT:
Each task object must include:
{
  "title": "specific actionable description",
  "estimated_time": "use 'm' and 'h' (e.g., '15m', '2h')",
  "is_urgent": boolean
}

URGENCY:
Set is_urgent: true only if text contains explicit urgency (urgent, ASAP, immediately, critical, blocking, overdue). Otherwise false.

QUALITY CHECKS:
- Stay faithful to the original text
- Only enhance clarity when information is actually available
- Break down tasks based on natural workflow, not arbitrary time chunks`
          },
          { role: 'user', content: brainDumpText }
        ],
        temperature: 0.3,
        max_tokens: 1500
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Failed to process brain dump');

    const cleaned = data.choices[0].message.content.replace(/```json\n?|\n?```/g, '').trim();
    const extractedTasks = JSON.parse(cleaned);

    if (!Array.isArray(extractedTasks)) {
      throw new Error('Invalid response format from AI');
    }

    return new Response(JSON.stringify({ tasks: extractedTasks }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in process-brain-dump function:', error);
    return new Response(JSON.stringify({
      error: error.message,
      details: 'Failed to process brain dump text'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});