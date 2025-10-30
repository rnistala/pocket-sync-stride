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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY is not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Researching company: ${companyName}${city ? ` in ${city}` : ''}`);
    
    const searchQuery = city 
      ? `Research ${companyName} in ${city}. Find: industry, products/services, company size, owner/key people, full address, phone number, email address, recent news, and a brief summary.`
      : `Research ${companyName}. Find: industry, products/services, company size, owner/key people, full address, phone number, email address, recent news, and a brief summary.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: searchQuery
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'return_company_research',
              description: 'Return structured company research data',
              parameters: {
                type: 'object',
                properties: {
                  industry: { type: 'string', description: 'Industry or sector the company operates in' },
                  products: { type: 'string', description: 'Main products or services offered' },
                  size: { type: 'string', description: 'Company size (employees, revenue, or description)' },
                  owner: { type: 'string', description: 'Owner or key executives' },
                  address: { type: 'string', description: 'Full business address' },
                  phone: { type: 'string', description: 'Contact phone number' },
                  email: { type: 'string', description: 'Contact email address' },
                  recentNews: { type: 'string', description: 'Recent news or developments' },
                  summary: { type: 'string', description: 'Brief company summary' }
                },
                required: ['industry', 'products', 'size', 'owner', 'address', 'phone', 'email', 'recentNews', 'summary'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'return_company_research' } }
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

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function?.name !== 'return_company_research') {
      console.error('No tool call in response:', data);
      return new Response(
        JSON.stringify({ error: 'Invalid AI response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let research;
    try {
      research = JSON.parse(toolCall.function.arguments);
      console.log('Research data parsed:', research);
    } catch (parseError) {
      console.error('Failed to parse tool call arguments:', parseError);
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
