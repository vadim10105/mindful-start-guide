import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Task {
  title: string;
  position: number;
  score?: number;
  is_liked: boolean;
  is_urgent: boolean;
  is_quick: boolean;
  category?: string;
  estimated_minutes?: number;
}

interface RequestBody {
  tasks: Task[];
  userPreferences?: Record<string, string>;
  peakEnergyTime?: string;
  lowestEnergyTime?: string;
  targetHours?: number;
  isShuffled: boolean;
  clientFinishTime?: string;
}

function getCurrentEnergyState(peakEnergyTime?: string, lowestEnergyTime?: string): 'high' | 'low' {
  if (!peakEnergyTime || !lowestEnergyTime) return 'high';

  const now = new Date();
  const currentHour = now.getHours();

  const parseTimeString = (timeStr: string): number => {
    const [hours] = timeStr.split(':').map(Number);
    return hours;
  };

  try {
    const peakHour = parseTimeString(peakEnergyTime);
    const lowHour = parseTimeString(lowestEnergyTime);

    const distanceToPeak = Math.min(
      Math.abs(currentHour - peakHour),
      24 - Math.abs(currentHour - peakHour)
    );
    
    const distanceToLow = Math.min(
      Math.abs(currentHour - lowHour),
      24 - Math.abs(currentHour - lowHour)
    );

    return distanceToPeak <= distanceToLow ? 'high' : 'low';
  } catch (error) {
    console.error('Error parsing energy times:', error);
    return 'high';
  }
}

async function generateExplanation(
  tasks: Task[],
  energyState: 'high' | 'low',
  userPreferences: Record<string, string>,
  targetHours?: number,
  clientFinishTime?: string
): Promise<string> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  // Calculate session duration
  const totalMinutes = tasks.reduce((sum, task) => 
    sum + (task.estimated_minutes || 30), 0
  );

  // Build task details for prompt
  const taskDetails = tasks.map((task, idx) => {
    const tags = [];
    if (task.is_quick) tags.push('QUICK-TAG');
    if (task.is_liked) tags.push('LIKED');
    if (task.is_urgent) tags.push('URGENT');
    
    const minutes = task.estimated_minutes || 30;
    const duration = minutes >= 60 ? 
      minutes % 60 === 0 ? 
        `${minutes/60} hour${minutes/60 > 1 ? 's' : ''}` : 
        `${Math.floor(minutes/60)}h ${minutes % 60}m` : 
      `${minutes} minutes`;
    
    return `${idx + 1}. "${task.title}" - Duration: ${duration}${task.category ? ` - Category: ${task.category}` : ''}${tags.length ? ' - Tags: ' + tags.join(', ') : ''}`;
  }).join('\n');

  // Let AI naturally consider breaks based on task flow and user needs

  // Calculate session vs target comparison
  const sessionHours = totalMinutes / 60;
  
  // Debug logging
  console.log('Session calculation:', {
    totalMinutes,
    sessionHours,
    targetHours,
    comparison: sessionHours > targetHours
  });
  
  const targetContext = targetHours ? 
    sessionHours > targetHours ? 
      `This is ${Math.round((sessionHours - targetHours) * 10) / 10}h more than your usual ${targetHours}h focus sessions.` :
    sessionHours < targetHours * 0.7 ?
      `Light session - well under your typical ${targetHours}h.` :
      `Nice match for your usual ${targetHours}h focus time.`
    : '';

  // Use client-provided finish time or calculate a fallback
  const finishTimeString = clientFinishTime || (() => {
    // Fallback calculation if client didn't provide time
    const now = new Date();
    const sessionHoursRounded = Math.round(totalMinutes/60);
    
    // Add breaks: roughly 10-15 min break per hour of work
    const breakMinutes = sessionHoursRounded <= 1 ? 0 : 
                        sessionHoursRounded <= 2 ? 15 :
                        sessionHoursRounded <= 3 ? 30 :
                        sessionHoursRounded <= 4 ? 45 :
                        60; // For 4+ hour sessions
    
    const totalTimeWithBreaks = totalMinutes + breakMinutes;
    const finishTime = new Date(now.getTime() + totalTimeWithBreaks * 60 * 1000);
    
    // Round to nearest half hour
    const minutes = finishTime.getMinutes();
    const roundedMinutes = Math.round(minutes / 30) * 30;
    finishTime.setMinutes(roundedMinutes);
    
    // If rounding pushed us to the next hour, adjust
    if (roundedMinutes === 60) {
      finishTime.setMinutes(0);
      finishTime.setHours(finishTime.getHours() + 1);
    }
    
    return finishTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  })();

  const prompt = `Tasks ordered:
${taskDetails}

Energy: ${energyState === 'high' ? 'peak hours' : 'low energy'}
Total session: ${Math.round(totalMinutes/60)}h ${totalMinutes % 60}m
${targetContext}
Estimated finish: around ${finishTimeString} (with breaks)

Write a BRIEF explanation (60-80 words MAX) explaining WHY each task is positioned where it is to maximize completion probability. IMPORTANT: You MUST discuss the tasks IN NUMERICAL ORDER (start with [1], then [2], then [3], etc.) - explain why each task works well in its specific position. Focus on the strategic reasoning - momentum, energy matching, cognitive load, etc. ${targetContext ? `Note: ${targetContext}` : ''} Be specific about WHY this order helps you finish. NO SUMMARY. End with: "You'll wrap up around ${finishTimeString}." 

As you describe the task flow, suggest breaks in a task-centered way (never time-specific):
- For long tasks (1+ hours): "take a break halfway through" or "pause midway if needed"
- Between very different types of tasks: "good time for a break" or "stretch your legs before..."
- For multiple similar tasks: "take a break after the second one"
- NEVER say specific times like "after 45 minutes" - always relate breaks to task completion or progress
- AVOID corporate clichés like "breather", "switch gears", "pivot", etc.

FORMATTING RULES: 
1. When mentioning a task by name, format it as: **[1] Task Name** or **[2] Task Name** etc. based on its position in the list.
2. Add a line break (new paragraph) after discussing each task to create visual breathing room.
3. CRITICAL: Discuss tasks in SEQUENTIAL ORDER (1, 2, 3, etc.) - never jump around or reorder them in your explanation.
4. Structure like: "Start with **[1] First Task**... [line break] Then move to **[2] Second Task**... [line break] Finally **[3] Third Task**..."

Don't save all break mentions for the end - mention them AS you describe moving through the tasks.

Focus on WHY the order works strategically:
- Quick start: "Starting small builds momentum for bigger tasks ahead"
- Energy matching: "Tackling complex work now while your focus is sharpest"
- Category batching: "Staying in creative mode avoids mental context switching"
- Urgent timing: "Getting this done early removes mental pressure"
- Liked tasks: "Your enjoyment here will fuel energy for what follows"
- End strong: "Finishing with something manageable ensures you complete the session"

CRITICAL RULES - PAY ATTENTION TO TASK DURATIONS:
1. Read the ACTUAL duration listed for each task. DO NOT make up times!
   - If it says "Duration: 1 hour" → This will take AN HOUR, not "a minute"
   - If it says "Duration: 30 minutes" → This is a half-hour task
   - If it says "Duration: 15 minutes" → This is a short 15-minute task
   
2. Only call something "quick" if it has "QUICK-TAG" in its tags. A 15-minute task without QUICK-TAG is just "short", not "quick".

3. BE REALISTIC about time:
   - NEVER say "you'll get it done in a minute" for hour-long tasks
   - NEVER minimize actual task durations
   - If a task is 2 hours, acknowledge it's a "couple hours of work"

4. Only mention LIKED, URGENT, or QUICK-TAG if you see those exact words in the task's tags section.

5. NEVER say "it's liked" or "it's urgent" or "it's quick" - instead weave these attributes naturally into the description:
   - BAD: "This task is liked and urgent"
   - GOOD: "Tackle that important project while you're energized"

6. When mentioning categories or attributes, be subtle and conversational:
   - BAD: "These are both Admin Work tasks"
   - GOOD: "Keep the admin momentum going"

`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a concise ADHD coach. Be BRIEF - one short sentence per task. No long explanations or fluff. Just explain the task order logic quickly. Think Twitter-length, not blog post. Get to the point.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error generating explanation:', error);
    throw error;
  }
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: RequestBody = await req.json();
    
    // Only generate explanation for shuffled orders
    if (!body.isShuffled) {
      return new Response(JSON.stringify({ 
        explanation: null,
        message: 'No explanation needed for manual order'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { tasks, userPreferences = {}, peakEnergyTime, lowestEnergyTime, targetHours, clientFinishTime } = body;
    
    if (!tasks || tasks.length === 0) {
      return new Response(JSON.stringify({ 
        explanation: null,
        error: 'No tasks provided'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    // Determine current energy state
    const energyState = getCurrentEnergyState(peakEnergyTime, lowestEnergyTime);
    
    // Generate AI explanation
    const explanation = await generateExplanation(tasks, energyState, userPreferences, targetHours, clientFinishTime);

    return new Response(JSON.stringify({
      explanation,
      energyState,
      totalMinutes: tasks.reduce((sum, t) => sum + (t.estimated_minutes || 30), 0)
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in explain-task-order function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      explanation: null
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});