import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to get a preview of the description for subject line
const getSubjectPreview = (description: string, maxLength: number = 50): string => {
  if (!description) return '';
  const cleaned = description.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxLength) return cleaned;
  const truncated = cleaned.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return (lastSpace > 20 ? truncated.substring(0, lastSpace) : truncated) + '...';
};

interface QueryEmailRequest {
  userId: string;
  contactEmail: string;
  userEmail?: string;
  ticketId: string;
  issueType: string;
  description: string;
  remarks: string;
}

// Helper function to format description with proper line breaks
const formatDescription = (text: string): string => {
  if (!text) return '';
  
  // First, convert existing newlines to <br>
  let formatted = text.replace(/\n/g, '<br>');
  
  // Add line break before numbered items (1. 2. 3. etc.) that don't already have one
  formatted = formatted.replace(/(?<!<br>)(\s*)(\d{1,2}\.\s)/g, '<br><br>$2');
  
  // Clean up any leading <br> tags
  formatted = formatted.replace(/^(<br>)+/, '');
  
  return formatted;
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      userId, contactEmail, userEmail, ticketId, 
      issueType, description, remarks 
    }: QueryEmailRequest = await req.json();
    
    console.log(`[EMAIL] Sending client query notification for ticket ${ticketId}`);
    
    // Build HTML email body
    const emailBody = `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #d97706; border-bottom: 2px solid #d97706; padding-bottom: 10px;">
      Clarification Required
    </h2>
    
    <p>We need your input to proceed with the following ticket:</p>
    
    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; width: 140px;">Ticket No:</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${ticketId}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Issue Type:</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${issueType}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; vertical-align: top;">Original Issue:</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${formatDescription(description)}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; vertical-align: top;">Query / Remarks:</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${formatDescription(remarks) || 'No remarks provided'}</td>
      </tr>
    </table>
    
    <p style="margin-top: 20px; padding: 15px; background-color: #fef3c7; border-left: 4px solid #d97706; color: #92400e;">
      <strong>Action Required:</strong> Please respond with the requested information so we can continue working on your request.
    </p>
    
    <p style="margin-top: 30px; font-size: 12px; color: #6b7280;">
      This is an automated notification from Opterix 360.
    </p>
  </div>
</body>
</html>
`;

    // Build recipient list - contact email + user email (CC)
    const recipients = userEmail ? `${contactEmail},${userEmail}` : contactEmail;
    
    // Call Opterix email API
    const emailPayload = [{
      id: userId,
      to: recipients,
      subject: `[Opterix 360] ${ticketId} | Query: ${getSubjectPreview(description)}`,
      body: emailBody
    }];

    console.log(`[EMAIL] Calling API with recipients: ${recipients}`);
    
    const response = await fetch(`https://demo.opterix.in/api/public/qmail/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailPayload)
    });

    const responseText = await response.text();
    console.log(`[EMAIL] API Response: ${responseText}`);
    
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
    console.error('[EMAIL] Error sending query email:', error);
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
