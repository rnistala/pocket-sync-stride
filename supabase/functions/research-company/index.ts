import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyName, city } = await req.json();
    
    if (!companyName) {
      return new Response(
        JSON.stringify({ error: 'Company name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      console.error('PERPLEXITY_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Researching company: ${companyName}${city ? ` in ${city}` : ''}`);
    
    // Simple, focused query for faster results
    const searchQuery = city 
      ? `${companyName} in ${city} - industry, owner, address, phone, email`
      : `${companyName} - industry, owner, address, phone, email`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You must return ONLY valid JSON with no markdown formatting, no code blocks, no explanations. Return this exact structure: {"industry": "...", "products": "...", "size": "...", "owner": "...", "address": "...", "phone": "...", "email": "...", "recentNews": "...", "summary": "..."}. Use "Not available" if data missing. Do not include any text before or after the JSON object.'
          },
          {
            role: 'user',
            content: searchQuery
          }
        ],
        temperature: 0.2,
        max_tokens: 400
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to research company' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('AI response received:', JSON.stringify(data));

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error('No content in response:', data);
      return new Response(
        JSON.stringify({ error: 'Invalid AI response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract JSON from response (it might be wrapped in markdown code blocks or have text around it)
    let research;
    try {
      // First, try to remove markdown code blocks
      let cleanContent = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Try to find JSON object in the content
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        research = JSON.parse(jsonMatch[0]);
      } else {
        research = JSON.parse(cleanContent);
      }
      console.log('Research data parsed:', research);
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError, 'Content:', content);
      // Return a structured error with more details
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse research data from AI response',
          details: 'The AI returned an invalid format. Please try again.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ research }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in research-company function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
