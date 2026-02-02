import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Mail, Loader2, X, Plus, Users } from "lucide-react";
import { toast } from "sonner";

export interface ReportStats {
  totalTickets: number;
  closedTickets: number;
  openTickets: number;
  totalEffortMinutes: number;
  byRootCause: Record<string, number>;
  effortByRootCause: Record<string, number>;
}

export interface ReportTicket {
  id: string | number;
  ticketId?: string;
  description: string;
  rootCause?: string;
  effort_minutes?: number;
  closedDate?: string;
}

export interface SendReportPayload {
  recipients: string[];
  subject: string;
  customMessage: string;
}

interface SendReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyName: string;
  primaryEmail: string;
  monthLabel: string;
  stats: ReportStats;
  closedTickets: ReportTicket[];
  onSend: (payload: SendReportPayload) => Promise<void>;
  isSending?: boolean;
}

const formatEffort = (minutes: number): string => {
  if (minutes === 0) return "0h";
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
};

const formatDateShort = (dateStr: string): string => {
  const date = new Date(dateStr);
  const day = date.getDate().toString().padStart(2, '0');
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  return `${day}-${month}`;
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

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export function SendReportDialog({
  open,
  onOpenChange,
  companyName,
  primaryEmail,
  monthLabel,
  stats,
  closedTickets,
  onSend,
  isSending = false,
}: SendReportDialogProps) {
  const [customMessage, setCustomMessage] = useState("");
  const [additionalRecipients, setAdditionalRecipients] = useState<string[]>([]);
  const [newRecipientEmail, setNewRecipientEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [internalSending, setInternalSending] = useState(false);

  // Initialize subject when dialog opens
  useMemo(() => {
    if (open && !emailSubject) {
      setEmailSubject(`[Opterix 360] Monthly Performance Summary - ${companyName} - ${monthLabel}`);
    }
  }, [open, companyName, monthLabel]);

  // Reset state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setCustomMessage("");
      setAdditionalRecipients([]);
      setNewRecipientEmail("");
      setEmailSubject("");
    }
    onOpenChange(newOpen);
  };

  const handleAddRecipient = () => {
    const input = newRecipientEmail.trim();
    if (!input) return;
    
    const emails = input.split(/[,;\s]+/).map(e => e.trim().toLowerCase()).filter(Boolean);
    const validEmails: string[] = [];
    const errors: string[] = [];
    
    for (const email of emails) {
      if (!isValidEmail(email)) {
        errors.push(`"${email}" is not valid`);
      } else if (email === primaryEmail?.toLowerCase()) {
        errors.push(`"${email}" is already the primary`);
      } else if (additionalRecipients.includes(email)) {
        errors.push(`"${email}" already added`);
      } else {
        validEmails.push(email);
      }
    }
    
    if (validEmails.length > 0) {
      setAdditionalRecipients([...additionalRecipients, ...validEmails]);
    }
    if (errors.length > 0 && validEmails.length === 0) {
      toast.error(errors[0]);
    }
    setNewRecipientEmail("");
  };

  const handleRemoveRecipient = (email: string) => {
    setAdditionalRecipients(additionalRecipients.filter(e => e !== email));
  };

  const allRecipients = useMemo(() => {
    const recipients = primaryEmail ? [primaryEmail] : [];
    return [...recipients, ...additionalRecipients];
  }, [primaryEmail, additionalRecipients]);

  const handleSend = async () => {
    if (!customMessage.trim()) {
      toast.error("Please add a message to the report");
      return;
    }

    // Include any email(s) typed but not explicitly added
    let pendingRecipients = [...additionalRecipients];
    const pendingInput = newRecipientEmail.trim();
    if (pendingInput) {
      const pendingEmails = pendingInput.split(/[,;\s]+/).map(e => e.trim().toLowerCase()).filter(Boolean);
      for (const email of pendingEmails) {
        if (isValidEmail(email) && 
            !pendingRecipients.includes(email) && 
            email !== primaryEmail?.toLowerCase()) {
          pendingRecipients.push(email);
        }
      }
    }
    
    const finalRecipients = primaryEmail 
      ? [primaryEmail, ...pendingRecipients] 
      : pendingRecipients;
    
    if (finalRecipients.length === 0) {
      toast.error("No recipients specified");
      return;
    }

    setInternalSending(true);
    try {
      await onSend({
        recipients: finalRecipients,
        subject: emailSubject,
        customMessage: customMessage.trim(),
      });
      setNewRecipientEmail("");
    } finally {
      setInternalSending(false);
    }
  };

  const generatePreviewHtml = () => {
    // Calculate total effort for closed tickets
    const totalEffortMinutes = closedTickets.reduce((sum, t) => sum + (Number(t.effort_minutes) || 0), 0);

    // Build closed tickets rows
    const ticketRows = closedTickets.map(ticket => {
      const rootCause = ticket.rootCause || "Unspecified";
      const rootCauseColors = getRootCauseColor(rootCause);
      const closedDate = ticket.closedDate ? formatDateShort(ticket.closedDate) : '-';
      
      return `
        <tr style="vertical-align: top;">
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-family: monospace; font-size: 12px;">${ticket.ticketId || `#${ticket.id}`}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; white-space: pre-wrap; word-wrap: break-word;">${ticket.description.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
            <span style="background-color: ${rootCauseColors.bg}; color: ${rootCauseColors.text}; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${rootCause}</span>
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatEffort(Number(ticket.effort_minutes) || 0)}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">${closedDate}</td>
        </tr>
      `;
    }).join('');

    // Build root cause summary
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

    const customMessageHtml = customMessage.trim() ? `
      <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 16px 20px; margin-bottom: 25px; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; color: #0369a1; font-style: italic; white-space: pre-wrap;">${customMessage.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
      </div>
    ` : '';

    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; padding: 20px;">
        <div style="max-width: 700px; margin: 0 auto;">
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
          
          <div style="background-color: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
            ${customMessageHtml}
            
            <!-- Summary Cards -->
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
                  <div style="font-size: 20px; font-weight: bold; color: #7c3aed;">${formatEffort(totalEffortMinutes)}</div>
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
                  <th style="padding: 12px 10px; text-align: left; border-bottom: 2px solid #e5e7eb; font-weight: 600;">Closed</th>
                </tr>
              </thead>
              <tbody>
                ${ticketRows || '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #6b7280;">No closed tickets for this period</td></tr>'}
              </tbody>
            </table>
            
            <div style="margin-top: 20px; padding: 15px; background-color: #f0f9ff; border-radius: 8px; text-align: right;">
              <span style="color: #0369a1; font-weight: 600;">Total Effort This Month:</span>
              <span style="font-size: 18px; font-weight: bold; color: #0284c7; margin-left: 10px;">${formatEffort(totalEffortMinutes)}</span>
            </div>
          </div>
          
          <div style="padding: 20px; text-align: center; border-radius: 0 0 12px 12px; background-color: #f3f4f6;">
            <p style="margin: 0; font-size: 12px; color: #6b7280;">
              This report was generated by Opterix 360
            </p>
          </div>
        </div>
      </div>
    `;
  };

  const sending = isSending || internalSending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Preview
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 min-h-0 pr-4">
          <div className="space-y-4 pb-4">
            {/* Recipients Section */}
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Recipients</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {primaryEmail && (
                  <Badge variant="secondary" className="gap-1 py-1 px-2">
                    {primaryEmail}
                    <span className="text-xs text-muted-foreground ml-1">(primary)</span>
                  </Badge>
                )}
                {additionalRecipients.map(email => (
                  <Badge key={email} variant="outline" className="gap-1 py-1 px-2">
                    {email}
                    <button 
                      onClick={() => handleRemoveRecipient(email)}
                      className="ml-1 hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Add emails (comma-separated)..."
                  value={newRecipientEmail}
                  onChange={(e) => setNewRecipientEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddRecipient()}
                  className="flex-1"
                />
                <Button variant="outline" size="sm" onClick={handleAddRecipient} className="gap-1">
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>

            {/* Subject Section */}
            <div className="border rounded-lg p-4 bg-muted/30">
              <label className="text-sm font-medium mb-2 block">Subject</label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Email subject..."
                className="w-full"
              />
            </div>

            {/* Message Section - Mandatory */}
            <div className="border rounded-lg p-4 bg-muted/30">
              <label className="text-sm font-medium mb-2 block">
                Add message to report <span className="text-destructive">*</span>
              </label>
              <Textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Add a personalized message to include at the top of the report..."
                rows={3}
                required
              />
            </div>

            {/* Preview Section */}
            <div>
              <p className="text-sm text-muted-foreground mb-2">Preview:</p>
              <div className="border rounded-lg h-[300px] overflow-y-auto">
                <div 
                  dangerouslySetInnerHTML={{ __html: generatePreviewHtml() }}
                  className="text-sm"
                />
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0 pt-4 border-t">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending || !primaryEmail} className="gap-2">
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            Send to {allRecipients.length} recipient{allRecipients.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
