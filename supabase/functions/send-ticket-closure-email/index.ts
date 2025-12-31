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

interface ClosureEmailRequest {
  userId: string;
  contactEmail: string;
  userEmail?: string;  // CC the user who closed the ticket
  ticketId: string;
  issueType: string;
  description: string;
  remarks: string;
  rootCause?: string;
  effortMinutes?: number;
}

// Helper function to format effort in hours and minutes
const formatEffort = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
};

// Helper function to format description with proper line breaks
const formatDescription = (text: string): string => {
  if (!text) return '';
  
  // First, convert existing newlines to <br>
  let formatted = text.replace(/\n/g, '<br>');
  
  // Add line break before numbered items (1. 2. 3. etc.) that:
  // - Are at the start of the text, OR
  // - Are preceded by <br> (already on new line), OR
  // - Are preceded by whitespace (not part of another number like "10.")
  // Using positive lookbehind to prevent splitting "10." into "1" and "0."
  formatted = formatted.replace(/(?<=^|<br>|\s)(\d{1,2}\.\s)/g, '<br><br>$1');
  
  // Clean up any leading <br> tags
  formatted = formatted.replace(/^(<br>)+/, '');
  
  // Clean up excessive consecutive <br> tags (3+ becomes 2)
  formatted = formatted.replace(/(<br>){3,}/g, '<br><br>');
  
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
      issueType, description, remarks, rootCause, effortMinutes 
    }: ClosureEmailRequest = await req.json();
    
    console.log(`[EMAIL] Sending closure notification for ticket ${ticketId}`);
    
    // Format effort for display
    const effortDisplay = effortMinutes ? formatEffort(effortMinutes) : 'Not specified';
    
    // Build HTML email body
    const emailBody = `
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #16a34a; border-bottom: 2px solid #16a34a; padding-bottom: 10px;">
      Ticket Closed
    </h2>
    
    <p>The following ticket has been resolved and closed:</p>
    
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
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold; vertical-align: top;">Remarks / Analysis:</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${formatDescription(remarks) || 'No remarks provided'}</td>
      </tr>
      ${rootCause ? `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Root Cause:</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${rootCause}</td>
      </tr>
      ` : ''}
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Effort:</td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">${effortDisplay}</td>
      </tr>
    </table>
    
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
      subject: `[Opterix 360] ${ticketId} | Closed: ${getSubjectPreview(description)}`,
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
    console.error('[EMAIL] Error sending closure email:', error);
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
