
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TaskCategorizationRequest {
  tasks: string[];
}

interface CategoryResult {
  task: string;
  category: 'Creative' | 'Analytical' | 'Social' | 'Physical' | 'Routine' | 'Learning' | 'Planning';
  confidence: number;
  reasoning: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    const { tasks }: TaskCategorizationRequest = await req.json();

    console.log('Categorizing tasks:', tasks);

    const prompt = `You are a task categorization expert. Analyze each task and assign it to ONE of these 7 categories:

**Categories:**
1. **Creative** - Design, writing, art, brainstorming, content creation, visual work, UI/UX
2. **Analytical** - Research, data analysis, problem-solving, debugging, technical work, calculations
3. **Social** - Meetings, communication, collaboration, networking, presentations, client work
4. **Physical** - Exercise, manual work, hands-on tasks, building, repairs, movement-based activities
5. **Routine** - Administrative tasks, paperwork, filing, maintenance, recurring processes, cleanup
6. **Learning** - Study, training, skill development, reading, courses, practice, knowledge acquisition
7. **Planning** - Strategy, organizing, scheduling, project management, goal setting, roadmapping

**Instructions:**
- Assign each task to the MOST appropriate category
- Provide a confidence score (1-10, where 10 is most confident)
- Give a brief reasoning for your choice
- Consider the primary action/intent of the task

**Tasks to categorize:**
${tasks.map((task, i) => `${i + 1}. "${task}"`).join('\n')}

**Response format (JSON only):**
{
  "results": [
    {
      "task": "task text",
      "category": "CategoryName", 
      "confidence": 8,
      "reasoning": "Brief explanation"
    }
  ]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { 
            role: 'system', 
            content: 'You are a task categorization expert. Always respond with valid JSON only.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    console.log('OpenAI raw response:', content);

    // Parse the JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Invalid JSON response from OpenAI');
    }

    const results: CategoryResult[] = parsedResponse.results || [];
    
    console.log('Categorization results:', results);

    // Validate results
    const validCategories = ['Creative', 'Analytical', 'Social', 'Physical', 'Routine', 'Learning', 'Planning'];
    const validatedResults = results.map(result => {
      if (!validCategories.includes(result.category)) {
        console.warn(`Invalid category ${result.category} for task "${result.task}", defaulting to Routine`);
        result.category = 'Routine' as any;
      }
      return result;
    });

    return new Response(JSON.stringify({ 
      results: validatedResults,
      taskCount: tasks.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in categorize-task function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      fallback: true 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
