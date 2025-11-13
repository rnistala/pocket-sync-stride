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
    
    const searchQuery = city 
      ? `Research the real company "${companyName}" located in ${city}. Search the web and provide ONLY verified, factual information.

Return your response as a JSON object with these exact fields:
{
  "industry": "Industry or sector",
  "products": "Main products or services",
  "size": "Company size",
  "owner": "Owner or CEO name",
  "address": "Full business address",
  "phone": "Contact phone",
  "email": "Contact email",
  "recentNews": "Recent news",
  "summary": "Brief company description"
}

For any field where you cannot find verified information, use "Not available". Do NOT fabricate or guess. Return ONLY the JSON object, no other text.`
      : `Research the real company "${companyName}". Search the web and provide ONLY verified, factual information.

Return your response as a JSON object with these exact fields:
{
  "industry": "Industry or sector",
  "products": "Main products or services",
  "size": "Company size",
  "owner": "Owner or CEO name",
  "address": "Full business address",
  "phone": "Contact phone",
  "email": "Contact email",
  "recentNews": "Recent news",
  "summary": "Brief company description"
}

For any field where you cannot find verified information, use "Not available". Do NOT fabricate or guess. Return ONLY the JSON object, no other text.`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: 'You are a business research assistant. Search the web and provide ONLY verified, factual information. Always return valid JSON only.'
          },
          {
            role: 'user',
            content: searchQuery
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please check your Perplexity API credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to research company' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('Perplexity response received:', JSON.stringify(data));

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error('No content in response:', data);
      return new Response(
        JSON.stringify({ error: 'No research data returned from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to parse JSON from the response
    let research;
    try {
      // Remove markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      research = JSON.parse(jsonStr);
      console.log('Research data parsed:', research);
    } catch (parseError) {
      console.error('Failed to parse JSON from content:', content);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to parse research data',
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
