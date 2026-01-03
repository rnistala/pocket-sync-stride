import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TicketSummary {
  ticketId: string;
  issueType: string;
  description: string;
  status: string;
  effortMinutes: number;
  reportedDate: string;
  closedDate?: string;
}

interface DashboardEmailRequest {
  userId: string;
  contactEmail: string;
  contactName: string;
  companyName: string;
  monthLabel: string;
  customMessage?: string;
  stats: {
    totalTickets: number;
    closedTickets: number;
    openTickets: number;
    totalEffortMinutes: number;
    byIssueType: Record<string, number>;
    effortByIssueType: Record<string, number>;
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

const getStatusColor = (status: string): string => {
  switch (status) {
    case "CLOSED": return "#16a34a";
    case "IN PROGRESS": return "#2563eb";
    case "CLIENT QUERY": return "#ca8a04";
    default: return "#ea580c";
  }
};

const getIssueTypeColor = (issueType: string): { bg: string; text: string } => {
  switch (issueType) {
    case "Problem": return { bg: "#fef2f2", text: "#b91c1c" };
    case "New Work": return { bg: "#eff6ff", text: "#1d4ed8" };
    case "Support": return { bg: "#faf5ff", text: "#7c3aed" };
    case "Meeting": return { bg: "#f3f4f6", text: "#374151" };
    default: return { bg: "#f3f4f6", text: "#374151" };
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
      contactEmail, 
      contactName,
      companyName, 
      monthLabel,
      customMessage,
      stats,
      tickets
    }: DashboardEmailRequest = await req.json();
    
    console.log(`[DASHBOARD EMAIL] Sending report for ${companyName} - ${monthLabel}`);
    console.log(`[DASHBOARD EMAIL] Custom message: ${customMessage ? 'Yes' : 'No'}`);
    
    // Build ticket rows HTML
    const ticketRows = tickets.map(ticket => {
      const issueColors = getIssueTypeColor(ticket.issueType);
      const statusColor = getStatusColor(ticket.status);
      const truncatedDesc = ticket.description.length > 60 
        ? ticket.description.substring(0, 60) + '...' 
        : ticket.description;
      
      return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-family: monospace; font-size: 12px;">${ticket.ticketId}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
            <span style="background-color: ${issueColors.bg}; color: ${issueColors.text}; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${ticket.issueType}</span>
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; max-width: 250px;">${truncatedDesc}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
            <span style="color: ${statusColor}; font-weight: 500;">${ticket.status}</span>
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatEffort(ticket.effortMinutes)}</td>
        </tr>
      `;
    }).join('');

    // Build issue type summary
    const issueTypeSummary = Object.entries(stats.byIssueType)
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => {
        const effort = stats.effortByIssueType[type] || 0;
        const colors = getIssueTypeColor(
          type === 'BR' ? 'Problem' : 
          type === 'FR' ? 'New Work' : 
          type === 'SR' ? 'Support' : 'Meeting'
        );
        const label = type === 'BR' ? 'Problem' : 
                     type === 'FR' ? 'New Work' : 
                     type === 'SR' ? 'Support' : 'Meeting';
        return `
          <td style="padding: 15px; text-align: center; background-color: ${colors.bg}; border-radius: 8px;">
            <div style="color: ${colors.text}; font-weight: 600;">${label}</div>
            <div style="font-size: 20px; font-weight: bold; margin: 5px 0;">${count}</div>
            <div style="font-size: 12px; color: #6b7280;">${formatEffort(effort)}</div>
          </td>
        `;
      }).join('<td style="width: 10px;"></td>');

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
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">Monthly Service Report</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">${companyName}</p>
      <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0; font-size: 14px;">${monthLabel}</p>
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
      
      <!-- Issue type breakdown -->
      <h3 style="color: #374151; margin-bottom: 15px; font-size: 16px;">Effort by Category</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
        <tr>
          ${issueTypeSummary || '<td style="text-align: center; color: #6b7280; padding: 20px;">No categorized tickets</td>'}
        </tr>
      </table>
      
      <!-- Ticket details -->
      <h3 style="color: #374151; margin-bottom: 15px; font-size: 16px;">Ticket Details</h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <thead>
          <tr style="background-color: #f9fafb;">
            <th style="padding: 12px 10px; text-align: left; border-bottom: 2px solid #e5e7eb; font-weight: 600;">Ticket</th>
            <th style="padding: 12px 10px; text-align: left; border-bottom: 2px solid #e5e7eb; font-weight: 600;">Type</th>
            <th style="padding: 12px 10px; text-align: left; border-bottom: 2px solid #e5e7eb; font-weight: 600;">Description</th>
            <th style="padding: 12px 10px; text-align: left; border-bottom: 2px solid #e5e7eb; font-weight: 600;">Status</th>
            <th style="padding: 12px 10px; text-align: right; border-bottom: 2px solid #e5e7eb; font-weight: 600;">Effort</th>
          </tr>
        </thead>
        <tbody>
          ${ticketRows || '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #6b7280;">No tickets for this period</td></tr>'}
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

    // Call Opterix email API
    const emailPayload = [{
      id: userId,
      to: contactEmail,
      subject: `[Opterix 360] Monthly Service Report - ${companyName} - ${monthLabel}`,
      body: emailBody
    }];

    console.log(`[DASHBOARD EMAIL] Sending to: ${contactEmail}`);
    
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
