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
    const { companyName, city, question, previousContext } = await req.json();
    
    if (!companyName || !question) {
      return new Response(
        JSON.stringify({ error: 'Company name and question are required' }),
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

    console.log(`Follow-up research for: ${companyName}${city ? ` in ${city}` : ''}`);
    console.log(`Question: ${question}`);

    const locationContext = city ? ` located in ${city}` : '';
    const contextSection = previousContext 
      ? `\n\nPrevious research context about this company:\n${previousContext}\n\n`
      : '';

    const searchQuery = `You are researching the company "${companyName}"${locationContext}.${contextSection}

The user wants to know: ${question}

Search the web thoroughly and provide detailed, verified information to answer this question. Include:
- Specific facts, names, numbers when available
- Sources or references when possible
- Direct contact information if the question relates to people or contacts

Be comprehensive but focused on answering the specific question. If you cannot find verified information, say so clearly. Do not fabricate information.`;

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
            content: 'You are a business research assistant specialized in finding detailed, verified information about companies. Provide comprehensive answers with specific facts, names, and contact details when available. Format your response in clear, readable paragraphs. When listing multiple items, use bullet points for clarity.'
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
    console.log('Perplexity follow-up response received');

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error('No content in response:', data);
      return new Response(
        JSON.stringify({ error: 'No response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ response: content }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in research-company-followup function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
