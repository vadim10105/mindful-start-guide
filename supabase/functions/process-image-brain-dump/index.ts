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
    // Check if OpenAI API key is available
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }
    const { imageUrl } = await req.json();
    
    if (!imageUrl) {
      throw new Error('Image URL is required');
    }

    console.log('Processing image brain dump:', imageUrl);

    // Fetch the image from the provided URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image from ${imageUrl}: ${imageResponse.statusText}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    if (!imageBuffer) {
      throw new Error('Image buffer is empty or invalid');
    }

    // Convert image to base64
    const base64Image = btoa(new Uint8Array(imageBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));

    // First, extract text from the image
    const textExtractionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all text from this image. Return only the extracted text, no additional commentary.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 1500,
      }),
    });

    const textData = await textExtractionResponse.json();
    
    if (!textExtractionResponse.ok) {
      console.error('OpenAI API error for text extraction:', textData);
      throw new Error(textData.error?.message || 'Failed to extract text from image');
    }

    const extractedText = textData.choices[0]?.message?.content;
    console.log('Extracted text from image:', extractedText);
    
    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text could be extracted from the image');
    }

    // Now process the extracted text to get actionable tasks
    const taskExtractionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: `You are a task organization assistant. Your job is to take text and extract actionable tasks from it. Be liberal in what you consider a task - if something could reasonably be turned into an action, include it.

RULES:
1. Extract actionable tasks AND convert notes/ideas into actionable tasks where possible
2. Each task should be a single, clear action
3. Make tasks specific and actionable (e.g., "Email John about the meeting" not "John meeting")
4. If a complex item has multiple steps, break it into separate tasks
5. PRESERVE THE ORIGINAL ORDER - extract tasks in the same sequence they appear in the text
6. If you see lists, bullet points, or numbered items, treat each as a potential task
7. Convert vague notes into specific tasks (e.g., "dentist" becomes "Schedule dentist appointment")
8. Return ONLY a JSON array of task objects
9. Each task object should have: {"title": "task description", "estimated_time": "time estimate using 'm' and 'h' (e.g., '15m', '2h', '1h 30m')"}
10. If no clear tasks are found, create at least one task based on the general content`
          },
          {
            role: 'user',
            content: extractedText
          }
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    const taskData = await taskExtractionResponse.json();
    
    if (!taskExtractionResponse.ok) {
      console.error('OpenAI API error for task extraction:', taskData);
      throw new Error(taskData.error?.message || 'Failed to process extracted text');
    }

    const aiResponse = taskData.choices[0]?.message?.content;
    console.log('AI task extraction response:', aiResponse);
    console.log('Full taskData response:', JSON.stringify(taskData, null, 2));
    
    if (!aiResponse) {
      throw new Error('No response from AI for task extraction');
    }

    // Parse the JSON response from AI
    let extractedTasks;
    try {
      // Clean up the response in case it has markdown formatting
      const cleanedResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
      console.log('Cleaned AI response for parsing:', cleanedResponse);
      extractedTasks = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      console.error('Parse error details:', parseError);
      throw new Error(`Failed to parse extracted tasks: ${parseError.message}`);
    }

    // Validate the response structure
    if (!Array.isArray(extractedTasks)) {
      throw new Error('Invalid response format from AI');
    }

    console.log('Extracted tasks from image:', extractedTasks);
    
    // Check if we have any tasks
    if (extractedTasks.length === 0) {
      console.log('No actionable tasks found in the extracted text:', extractedText);
      // Instead of throwing an error, let's return an informative response
      throw new Error('No actionable tasks found in the image. The image may contain notes or text that are not task-oriented.');
    }

    return new Response(JSON.stringify({ tasks: extractedTasks }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-image-brain-dump function:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to process image brain dump'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
