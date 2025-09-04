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
  isShuffled: boolean;
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
  userPreferences: Record<string, string>
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
    if (task.is_quick) tags.push('quick');
    if (task.is_liked) tags.push('liked');
    if (task.is_urgent) tags.push('urgent');
    
    const minutes = task.estimated_minutes || 30;
    const duration = minutes >= 60 ? `${Math.round(minutes/60)}h` : `${minutes}m`;
    
    return `${idx + 1}. "${task.title}" (${duration}${tags.length ? ', ' + tags.join(', ') : ''})`;
  }).join('\n');

  const prompt = `Tasks ordered:
${taskDetails}

Energy: ${energyState === 'high' ? 'peak hours' : 'low energy'}
Total session: ${Math.round(totalMinutes/60)}h ${totalMinutes % 60}m

Write a casual, authentic explanation (2-3 sentences) about why this task order makes sense. Use "we" and "you" but avoid corporate speak like "dive in", "tackle", "leverage", "optimize", etc. Keep it real and human. Focus on:
- Why starting with this first task is smart
- How the middle tasks naturally flow 
- Why ending this way feels good

Example vibes (but vary it):
- "Starting with that quick email thing to get your brain going. Then we're doing the fun project while you're feeling good. Ending with some easy admin stuff so you don't finish stressed."
- "We're kicking off with something small to warm up. After that comes the meaty stuff you actually care about. Wrapping up with lighter work so you end on a chill note."
- "First up is a quick win to get you rolling. Then we hit the important stuff while you've got momentum. Closing out with easier tasks so you finish feeling good."

Use natural language. Mention specific task attributes (quick, liked, urgent) conversationally.`;

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
            content: 'You are a chill friend explaining why this task order makes sense. No corporate jargon. Keep it real, casual, and human. Use 2-3 sentences that sound like how people actually talk.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 150,
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
    // Fallback to template-based explanation
    return generateFallbackExplanation(tasks, energyState);
  }
}

function generateFallbackExplanation(tasks: Task[], energyState: 'high' | 'low'): string {
  const hasQuickStart = tasks[0]?.is_quick || (tasks[0]?.estimated_minutes && tasks[0].estimated_minutes <= 20);
  const hasLikedSecond = tasks[1]?.is_liked;
  const hasUrgent = tasks.some(t => t.is_urgent);

  if (energyState === 'high') {
    if (hasQuickStart && hasLikedSecond) {
      return "Starting with something quick to get your brain going. Then we're hitting that task you actually enjoy while you're feeling good. Ending with easier stuff so you don't finish feeling fried.";
    } else if (hasUrgent) {
      return "Since you're feeling sharp right now, we're getting the urgent stuff done first. After that comes work that'll keep you interested. Finishing up with lighter tasks so you end feeling good, not exhausted.";
    }
    return "We've set things up to match when you're feeling most awake. Starting with the harder stuff while you're fresh, then easing off as you go. You'll get a lot done without burning yourself out.";
  } else {
    if (hasQuickStart) {
      return "Since your energy's lower, we're starting super simple to get you going. Once you warm up, we'll work up to the bigger stuff. Ending with something easy so you finish on a good note.";
    }
    return "Working with your natural energy dip here. Starting with straightforward stuff to ease you in, then building up slowly. You'll still get things done without forcing it.";
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

    const { tasks, userPreferences = {}, peakEnergyTime, lowestEnergyTime } = body;
    
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
    const explanation = await generateExplanation(tasks, energyState, userPreferences);

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