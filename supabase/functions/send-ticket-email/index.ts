import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  userId: string;
  contactEmail: string;
  ticketId: string;
  issueType: string;
  description: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, contactEmail, ticketId, issueType, description }: EmailRequest = await req.json();
    
    console.log(`[EMAIL] Sending notification for ticket ${ticketId} to ${contactEmail}`);
    
    // Construct email body
    const emailBody = `A new ticket has been submitted with the following detail.
    
Ticket No: ${ticketId}
Issue Type: ${issueType}
Description: ${description}`;

    // Call Opterix email API
    const emailPayload = [{
      id: userId,
      to: contactEmail,
      subject: `[Opterix 360] New ticket ${ticketId}`,
      body: emailBody
    }];

    console.log(`[EMAIL] Calling API: https://demo.opterix.in/api/public/qmail/${userId}`);
    
    const response = await fetch(`https://demo.opterix.in/api/public/qmail/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailPayload)
    });

    const responseText = await response.text();
    console.log(`[EMAIL] API Response: ${responseText}`);
    
    // Check if the response indicates success
    const isSuccess = response.ok && (
      responseText.includes('"success"') || 
      responseText.includes('"send"') ||
      responseText.includes('success')
    );
    
    return new Response(JSON.stringify({ 
      success: isSuccess,
      status: responseText 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error: any) {
    console.error('[EMAIL] Error sending email:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
};

serve(handler);
