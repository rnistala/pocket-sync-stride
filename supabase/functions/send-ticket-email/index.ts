import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to format description with proper line breaks
const formatDescription = (text: string): string => {
  if (!text) return '';
  
  // First, convert existing newlines to <br>
  let formatted = text.replace(/\n/g, '<br>');
  
  // Add line break before numbered items (1. 2. 3. etc.) that don't already have one
  // Match patterns like "1." "2." up to "99." that are preceded by non-newline content
  formatted = formatted.replace(/(?<!<br>)(\s*)(\d{1,2}\.\s)/g, '<br><br>$2');
  
  // Clean up any leading <br> tags
  formatted = formatted.replace(/^(<br>)+/, '');
  
  return formatted;
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
    
    // CC ravi@opterix.in on all new ticket notifications
    const ccEmail = 'ravi@opterix.in';
    const recipients = `${contactEmail},${ccEmail}`;
    
    console.log(`[EMAIL] Sending notification for ticket ${ticketId} to ${contactEmail} (CC: ${ccEmail})`);
    
    // Construct HTML email body
    const emailBody = `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">
      New Ticket Notification
    </h2>
    
    <p>A new ticket has been submitted with the following details:</p>
    
    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; width: 120px;">Ticket No:</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${ticketId}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Issue Type:</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${issueType}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; vertical-align: top;">Description:</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${formatDescription(description)}</td>
      </tr>
    </table>
    
    <p style="margin-top: 30px; font-size: 12px; color: #6b7280;">
      This is an automated notification from Opterix 360.
    </p>
  </div>
</body>
</html>
    `;

    // Call Opterix email API
    const emailPayload = [{
      id: userId,
      to: recipients,
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
