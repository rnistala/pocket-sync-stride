import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TicketSummary {
  ticketId: string;
  description: string;
  rootCause: string;
  effortMinutes: number;
  reportedDate: string;
  closedDate?: string;
}

interface DashboardEmailRequest {
  userId: string;
  recipients: string[];
  contactName: string;
  companyName: string;
  monthLabel: string;
  customMessage?: string;
  subject?: string;
  stats: {
    totalTickets: number;
    closedTickets: number;
    openTickets: number;
    totalEffortMinutes: number;
    byRootCause: Record<string, number>;
    effortByRootCause: Record<string, number>;
  };
  tickets: TicketSummary[];
}

// Helper function to format effort in hours and minutes
const formatEffort = (minutes: number): string => {
  if (minutes === 0) return "0 hours";
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
  if (remainingMinutes === 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
  return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
};

const getRootCauseColor = (rootCause: string): { bg: string; text: string } => {
  switch (rootCause) {
    case "Software": return { bg: "#eff6ff", text: "#1d4ed8" };
    case "Data": return { bg: "#fff7ed", text: "#c2410c" };
    case "Usage": return { bg: "#f0fdf4", text: "#166534" };
    case "New Work": return { bg: "#faf5ff", text: "#7c3aed" };
    case "Meeting": return { bg: "#f0fdfa", text: "#0d9488" };
    default: return { bg: "#f3f4f6", text: "#6b7280" };
  }
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      userId, 
      recipients,
      contactName,
      companyName, 
      monthLabel,
      customMessage,
      subject,
      stats,
      tickets
    }: DashboardEmailRequest = await req.json();
    
    console.log(`[DASHBOARD EMAIL] Sending report for ${companyName} - ${monthLabel}`);
    console.log(`[DASHBOARD EMAIL] Recipients: ${recipients.join(', ')}`);
    console.log(`[DASHBOARD EMAIL] Custom message: ${customMessage ? 'Yes' : 'No'}`);
    console.log(`[DASHBOARD EMAIL] Closed tickets count: ${tickets.length}`);
    
    const reportDate = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    
    // Build closed ticket rows HTML (matching app display)
    const ticketRows = tickets.map(ticket => {
      const rootCauseColors = getRootCauseColor(ticket.rootCause);
      const reportedDate = new Date(ticket.reportedDate).toLocaleDateString();
      const closedDate = ticket.closedDate ? new Date(ticket.closedDate).toLocaleDateString() : '-';
      
      return `
        <tr style="vertical-align: top;">
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-family: monospace; font-size: 12px;">${ticket.ticketId}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; white-space: pre-wrap; word-wrap: break-word;">${ticket.description.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
            <span style="background-color: ${rootCauseColors.bg}; color: ${rootCauseColors.text}; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${ticket.rootCause}</span>
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatEffort(ticket.effortMinutes)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">${reportedDate}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">${closedDate}</td>
        </tr>
      `;
    }).join('');

    // Build root cause summary (matching app display)
    const rootCauseSummary = Object.entries(stats.byRootCause)
      .filter(([_, count]) => count > 0)
      .map(([cause, count]) => {
        const effort = stats.effortByRootCause[cause] || 0;
        const colors = getRootCauseColor(cause);
        return `
          <td style="padding: 12px; text-align: center; background-color: ${colors.bg}; border-radius: 8px;">
            <div style="color: ${colors.text}; font-weight: 600; font-size: 13px;">${cause}</div>
            <div style="font-size: 18px; font-weight: bold; margin: 4px 0;">${count} tickets</div>
            <div style="font-size: 12px; color: #6b7280;">${formatEffort(effort)}</div>
          </td>
        `;
      }).join('<td style="width: 8px;"></td>');

    // Build custom message section if provided
    const customMessageHtml = customMessage ? `
      <!-- Custom Message -->
      <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 16px 20px; margin-bottom: 25px; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; color: #0369a1; font-style: italic; white-space: pre-wrap;">${customMessage.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
      </div>
    ` : '';

    // Build HTML email body
    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f9fafb;">
  <div style="max-width: 700px; margin: 0 auto; padding: 20px;">
    <!-- Compact Header -->
    <div style="background: #f8f9fa; border-bottom: 2px solid #e5e7eb; padding: 16px 24px; border-radius: 12px 12px 0 0;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="font-size: 18px; font-weight: bold; color: #1a1a1a;">${companyName}</td>
          <td style="text-align: right; font-size: 14px; color: #666666;">Report: ${monthLabel}</td>
        </tr>
        <tr>
          <td colspan="2" style="font-size: 14px; color: #666666; padding-top: 4px;">Monthly Performance Summary</td>
        </tr>
      </table>
    </div>
    
    <!-- Main content -->
    <div style="background-color: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
      
      ${customMessageHtml}
      
      <!-- Summary cards -->
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <tr>
          <td style="padding: 15px; text-align: center; background-color: #f0f9ff; border-radius: 8px;">
            <div style="color: #0369a1; font-size: 12px; text-transform: uppercase;">Total Tickets</div>
            <div style="font-size: 28px; font-weight: bold; color: #0284c7;">${stats.totalTickets}</div>
          </td>
          <td style="width: 10px;"></td>
          <td style="padding: 15px; text-align: center; background-color: #f0fdf4; border-radius: 8px;">
            <div style="color: #166534; font-size: 12px; text-transform: uppercase;">Closed</div>
            <div style="font-size: 28px; font-weight: bold; color: #16a34a;">${stats.closedTickets}</div>
          </td>
          <td style="width: 10px;"></td>
          <td style="padding: 15px; text-align: center; background-color: #fff7ed; border-radius: 8px;">
            <div style="color: #c2410c; font-size: 12px; text-transform: uppercase;">Open</div>
            <div style="font-size: 28px; font-weight: bold; color: #ea580c;">${stats.openTickets}</div>
          </td>
          <td style="width: 10px;"></td>
          <td style="padding: 15px; text-align: center; background-color: #faf5ff; border-radius: 8px;">
            <div style="color: #7c3aed; font-size: 12px; text-transform: uppercase;">Total Effort</div>
            <div style="font-size: 20px; font-weight: bold; color: #7c3aed;">${formatEffort(stats.totalEffortMinutes)}</div>
          </td>
        </tr>
      </table>
      
      <!-- Effort by Root Cause -->
      <h3 style="color: #374151; margin-bottom: 15px; font-size: 16px;">Effort by Root Cause (Closed Tickets)</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <tr>
          ${rootCauseSummary || '<td style="text-align: center; color: #6b7280; padding: 20px;">No closed tickets</td>'}
        </tr>
      </table>
      
      <!-- Closed Tickets Table -->
      <h3 style="color: #374151; margin-bottom: 15px; font-size: 16px;">Closed Tickets</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background-color: #f9fafb;">
            <th style="padding: 12px 10px; text-align: left; border-bottom: 2px solid #e5e7eb; font-weight: 600;">Ticket ID</th>
            <th style="padding: 12px 10px; text-align: left; border-bottom: 2px solid #e5e7eb; font-weight: 600;">Description</th>
            <th style="padding: 12px 10px; text-align: left; border-bottom: 2px solid #e5e7eb; font-weight: 600;">Root Cause</th>
            <th style="padding: 12px 10px; text-align: right; border-bottom: 2px solid #e5e7eb; font-weight: 600;">Effort</th>
            <th style="padding: 12px 10px; text-align: left; border-bottom: 2px solid #e5e7eb; font-weight: 600;">Reported</th>
            <th style="padding: 12px 10px; text-align: left; border-bottom: 2px solid #e5e7eb; font-weight: 600;">Closed</th>
          </tr>
        </thead>
        <tbody>
          ${ticketRows || '<tr><td colspan="6" style="text-align: center; padding: 20px; color: #6b7280;">No closed tickets for this period</td></tr>'}
        </tbody>
      </table>
      
      <!-- Total effort footer -->
      <div style="margin-top: 20px; padding: 15px; background-color: #f0f9ff; border-radius: 8px; text-align: right;">
        <span style="color: #0369a1; font-weight: 600;">Total Effort This Month:</span>
        <span style="font-size: 18px; font-weight: bold; color: #0284c7; margin-left: 10px;">${formatEffort(stats.totalEffortMinutes)}</span>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="padding: 20px; text-align: center; border-radius: 0 0 12px 12px; background-color: #f3f4f6;">
      <p style="margin: 0; font-size: 12px; color: #6b7280;">
        This report was generated by Opterix 360 on ${new Date().toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      </p>
      <p style="margin: 10px 0 0 0; font-size: 11px; color: #9ca3af;">
        If you have any questions about this report, please contact your account manager.
      </p>
    </div>
  </div>
</body>
</html>
`;

    // Call Opterix email API with comma-separated recipients
    const emailSubject = subject || `[Opterix 360] Monthly Performance Summary - ${companyName} - ${monthLabel}`;
    const allRecipients = recipients.join(',');
    
    const emailPayload = [{
      id: userId,
      to: allRecipients,
      subject: emailSubject,
      body: emailBody
    }];

    console.log(`[DASHBOARD EMAIL] Sending to ${recipients.length} recipient(s): ${allRecipients}`);
    
    const response = await fetch(`https://demo.opterix.in/api/public/qmail/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(emailPayload)
    });

    const responseText = await response.text();
    console.log(`[DASHBOARD EMAIL] API Response: ${responseText}`);
    
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
    console.error('[DASHBOARD EMAIL] Error sending email:', error);
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