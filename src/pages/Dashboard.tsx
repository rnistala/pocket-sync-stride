import { useLeadContext } from "@/contexts/LeadContext";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronRight, Ticket, Clock, CheckCircle, AlertCircle, BarChart3, Mail, Loader2, X, Plus, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getIssueTypeLabel } from "@/lib/issueTypeUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import opterixLogoDark from "@/assets/opterix-logo-dark.png";
import opterixLogoLight from "@/assets/opterix-logo-light.png";

interface CustomerStats {
  contactId: string;
  name: string;
  company: string;
  email: string;
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
  inProgressTickets: number;
  clientQueryTickets: number;
  totalEffortMinutes: number;
  byIssueType: {
    BR: number;
    FR: number;
    SR: number;
    MG: number;
  };
  effortByIssueType: {
    BR: number;
    FR: number;
    SR: number;
    MG: number;
  };
  byRootCause: Record<string, number>;
  effortByRootCause: Record<string, number>;
}

const formatEffort = (minutes: number): string => {
  if (minutes === 0) return "0h";
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { contacts, tickets, isLoading } = useLeadContext();
  
  // Month filter - read from URL, default to current month
  const selectedMonth = useMemo(() => {
    const urlMonth = searchParams.get('month');
    if (urlMonth) return urlMonth;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, [searchParams]);

  // Update URL when month changes
  const setSelectedMonth = (value: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('month', value);
    setSearchParams(newParams);
  };

  // Email dialog state
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerStats | null>(null);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [primaryRecipient, setPrimaryRecipient] = useState("");
  const [additionalRecipients, setAdditionalRecipients] = useState<string[]>([]);
  const [newRecipientEmail, setNewRecipientEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Generate month options (last 12 months)
  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    return options;
  }, []);

  // Parse selected month boundaries
  const { startOfMonth, endOfMonth } = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    return {
      startOfMonth: new Date(year, month - 1, 1),
      endOfMonth: new Date(year, month, 0, 23, 59, 59, 999),
    };
  }, [selectedMonth]);

  // Filter tickets: "working set" = opened in month + carried over from previous months
  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      const reportedDate = new Date(ticket.reportedDate);
      const closedDate = ticket.closedDate ? new Date(ticket.closedDate) : null;
      
      // Case 1: Tickets opened in this month
      const openedInMonth = reportedDate >= startOfMonth && reportedDate <= endOfMonth;
      
      // Case 2: Tickets carried over (reported before this month AND 
      //         either still open OR closed during/after this month)
      const carriedOver = reportedDate < startOfMonth && 
                          (!closedDate || closedDate >= startOfMonth);
      
      return openedInMonth || carriedOver;
    });
  }, [tickets, startOfMonth, endOfMonth]);

  // Aggregate stats per customer
  const customerStats = useMemo(() => {
    const statsMap = new Map<string, CustomerStats>();
    
    filteredTickets.forEach(ticket => {
      const contact = contacts.find(c => c.id === ticket.contactId);
      if (!contact) return;
      
      if (!statsMap.has(ticket.contactId)) {
        statsMap.set(ticket.contactId, {
          contactId: ticket.contactId,
          name: contact.name,
          company: contact.company,
          email: contact.email || '',
          totalTickets: 0,
          openTickets: 0,
          closedTickets: 0,
          inProgressTickets: 0,
          clientQueryTickets: 0,
          totalEffortMinutes: 0,
          byIssueType: { BR: 0, FR: 0, SR: 0, MG: 0 },
          effortByIssueType: { BR: 0, FR: 0, SR: 0, MG: 0 },
          byRootCause: { Software: 0, Data: 0, Usage: 0, "New Work": 0, Meeting: 0, Unspecified: 0 },
          effortByRootCause: { Software: 0, Data: 0, Usage: 0, "New Work": 0, Meeting: 0, Unspecified: 0 },
        });
      }
      
      const stats = statsMap.get(ticket.contactId)!;
      stats.totalTickets++;
      stats.totalEffortMinutes += Number(ticket.effort_minutes) || 0;
      
      // Count by status - closed only if closed within selected month
      const closedDate = ticket.closedDate ? new Date(ticket.closedDate) : null;
      const closedInMonth = closedDate && 
                            closedDate >= startOfMonth && 
                            closedDate <= endOfMonth;

      if (closedInMonth) {
        stats.closedTickets++;
        // Track root cause for closed tickets
        const rootCause = ticket.rootCause || "Unspecified";
        const ticketEffort = Number(ticket.effort_minutes) || 0;
        if (rootCause in stats.byRootCause) {
          stats.byRootCause[rootCause]++;
          stats.effortByRootCause[rootCause] += ticketEffort;
        } else {
          stats.byRootCause["Unspecified"]++;
          stats.effortByRootCause["Unspecified"] += ticketEffort;
        }
      } else {
        // Still open or closed after month end
        stats.openTickets++;
      }

      // Track detailed status for display
      switch (ticket.status) {
        case "IN PROGRESS":
          stats.inProgressTickets++;
          break;
        case "CLIENT QUERY":
          stats.clientQueryTickets++;
          break;
      }
      
      // Count by issue type
      const issueType = ticket.issueType as keyof typeof stats.byIssueType;
      if (issueType in stats.byIssueType) {
        stats.byIssueType[issueType]++;
        stats.effortByIssueType[issueType] += Number(ticket.effort_minutes) || 0;
      }
    });
    
    // Sort by total effort (descending)
    return Array.from(statsMap.values()).sort((a, b) => b.totalEffortMinutes - a.totalEffortMinutes);
  }, [filteredTickets, contacts, startOfMonth, endOfMonth]);

  // Overall totals
  const totals = useMemo(() => {
    return customerStats.reduce(
      (acc, stats) => ({
        totalTickets: acc.totalTickets + stats.totalTickets,
        totalEffort: acc.totalEffort + stats.totalEffortMinutes,
        openTickets: acc.openTickets + stats.openTickets,
        closedTickets: acc.closedTickets + stats.closedTickets,
        customers: acc.customers + 1,
      }),
      { totalTickets: 0, totalEffort: 0, openTickets: 0, closedTickets: 0, customers: 0 }
    );
  }, [customerStats]);

  const selectedMonthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || '';

  // Get closed tickets for a specific customer (for email)
  const getClosedTicketsForCustomer = (contactId: string) => {
    return tickets.filter(ticket => {
      if (ticket.contactId !== contactId) return false;
      const closedDate = ticket.closedDate ? new Date(ticket.closedDate) : null;
      return closedDate && closedDate >= startOfMonth && closedDate <= endOfMonth;
    });
  };

  // Format date for email
  const formatDateShort = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    return `${day}-${month}`;
  };

  // Generate email preview HTML (matches CustomerDashboard)
  const generatePreviewHtml = () => {
    if (!selectedCustomer) return '';

    const closedTickets = getClosedTicketsForCustomer(selectedCustomer.contactId);

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
    const rootCauseSummary = Object.entries(selectedCustomer.byRootCause)
      .filter(([_, count]) => count > 0)
      .map(([cause, count]) => {
        const effort = selectedCustomer.effortByRootCause[cause] || 0;
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

    // Calculate total effort for closed tickets
    const totalEffortMinutes = closedTickets.reduce((sum, t) => sum + (Number(t.effort_minutes) || 0), 0);

    return `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9fafb; padding: 20px;">
        <div style="max-width: 700px; margin: 0 auto;">
          <!-- Compact Header -->
          <div style="background: #f8f9fa; border-bottom: 2px solid #e5e7eb; padding: 16px 24px; border-radius: 12px 12px 0 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="font-size: 18px; font-weight: bold; color: #1a1a1a;">${selectedCustomer.company}</td>
                <td style="text-align: right; font-size: 14px; color: #666666;">Report: ${selectedMonthLabel}</td>
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
                  <div style="font-size: 28px; font-weight: bold; color: #0284c7;">${selectedCustomer.totalTickets}</div>
                </td>
                <td style="width: 10px;"></td>
                <td style="padding: 15px; text-align: center; background-color: #f0fdf4; border-radius: 8px;">
                  <div style="color: #166534; font-size: 12px; text-transform: uppercase;">Closed</div>
                  <div style="font-size: 28px; font-weight: bold; color: #16a34a;">${selectedCustomer.closedTickets}</div>
                </td>
                <td style="width: 10px;"></td>
                <td style="padding: 15px; text-align: center; background-color: #fff7ed; border-radius: 8px;">
                  <div style="color: #c2410c; font-size: 12px; text-transform: uppercase;">Open</div>
                  <div style="font-size: 28px; font-weight: bold; color: #ea580c;">${selectedCustomer.openTickets}</div>
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

  // Open email dialog for a customer
  const handleOpenEmailDialog = (customer: CustomerStats, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCustomer(customer);
    setEmailSubject(`[Opterix 360] Monthly Performance Summary - ${customer.company} - ${selectedMonthLabel}`);
    setCustomMessage("");
    setPrimaryRecipient(customer.email || "");
    setAdditionalRecipients([]);
    setNewRecipientEmail("");
    setIsEmailDialogOpen(true);
  };

  // Add recipient(s) - supports comma/semicolon/space-separated emails
  const handleAddRecipient = () => {
    const input = newRecipientEmail.trim();
    if (!input) return;
    
    // Split by comma, semicolon, or whitespace
    const emails = input.split(/[,;\s]+/).map(e => e.trim().toLowerCase()).filter(Boolean);
    const validEmails: string[] = [];
    
    for (const email of emails) {
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && 
          !additionalRecipients.includes(email) && 
          email !== primaryRecipient.toLowerCase()) {
        validEmails.push(email);
      }
    }
    
    if (validEmails.length > 0) {
      setAdditionalRecipients([...additionalRecipients, ...validEmails]);
    }
    setNewRecipientEmail("");
  };

  // Remove recipient
  const handleRemoveRecipient = (email: string) => {
    setAdditionalRecipients(additionalRecipients.filter(r => r !== email));
  };

  // Send email
  const handleSendEmail = async () => {
    if (!selectedCustomer) return;
    
    setIsSendingEmail(true);
    try {
      const closedTickets = getClosedTicketsForCustomer(selectedCustomer.contactId);
      
      // Validate message is required
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
          if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && 
              !pendingRecipients.includes(email) && 
              email !== primaryRecipient.toLowerCase()) {
            pendingRecipients.push(email);
          }
        }
      }
      
      // Prepare all recipients as an array
      const allRecipients = [primaryRecipient, ...pendingRecipients].filter(Boolean);
      
      // Prepare tickets for email (matching edge function interface)
      const ticketSummaries = closedTickets.map(ticket => ({
        ticketId: ticket.ticketId || '',
        description: ticket.description,
        rootCause: ticket.rootCause || "Unspecified",
        effortMinutes: Number(ticket.effort_minutes) || 0,
        reportedDate: ticket.reportedDate,
        closedDate: ticket.closedDate || undefined,
      }));

      // Calculate total effort for closed tickets only
      const totalEffortMinutes = closedTickets.reduce((sum, t) => sum + (Number(t.effort_minutes) || 0), 0);

      // Build payload matching DashboardEmailRequest interface
      const payload = {
        userId: "7", // Required by the external email API
        recipients: allRecipients,
        contactName: selectedCustomer.name,
        companyName: selectedCustomer.company,
        monthLabel: selectedMonthLabel,
        customMessage: customMessage.trim() || undefined,
        subject: emailSubject,
        stats: {
          totalTickets: selectedCustomer.totalTickets,
          closedTickets: selectedCustomer.closedTickets,
          openTickets: selectedCustomer.openTickets,
          totalEffortMinutes: totalEffortMinutes,
          byRootCause: selectedCustomer.byRootCause,
          effortByRootCause: selectedCustomer.effortByRootCause,
        },
        tickets: ticketSummaries,
      };

      const { error } = await supabase.functions.invoke('send-dashboard-email', {
        body: payload,
      });

      if (error) throw error;

      toast.success(`Report sent to ${allRecipients.join(', ')}`);
      setNewRecipientEmail("");
      setIsEmailDialogOpen(false);
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Failed to send report. Please try again.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-textured flex items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-textured">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-textured backdrop-blur-sm border-b border-border shadow-sm">
        <div className="max-w-5xl mx-auto px-3 py-3 md:px-8 md:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <img src={opterixLogoDark} alt="Opterix 360" className="h-6 dark:hidden" />
                <img src={opterixLogoLight} alt="Opterix 360" className="h-6 hidden dark:block" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="font-semibold text-lg">Effort Dashboard</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-3 py-4 md:px-8 md:py-6">
        {/* Month selector */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Customer Effort Summary</h1>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Ticket className="h-4 w-4" />
                <span>Total Tickets</span>
              </div>
              <p className="text-2xl font-bold mt-1">{totals.totalTickets}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Clock className="h-4 w-4" />
                <span>Total Effort</span>
              </div>
              <p className="text-2xl font-bold mt-1">{formatEffort(totals.totalEffort)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Closed</span>
              </div>
              <p className="text-2xl font-bold mt-1">{totals.closedTickets}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <span>Open</span>
              </div>
              <p className="text-2xl font-bold mt-1">{totals.openTickets}</p>
            </CardContent>
          </Card>
        </div>

        {/* Customer list */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">{totals.customers} Customers with Tickets </h2>
          
          {customerStats.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No tickets found for {selectedMonthLabel}
              </CardContent>
            </Card>
          ) : (
            customerStats.map(stats => (
              <Card 
                key={stats.contactId}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => navigate(`/dashboard/${stats.contactId}?month=${selectedMonth}`)}
              >
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{stats.company}</h3>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{stats.name}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="text-right">
                        <p className="font-medium">{stats.totalTickets} tickets</p>
                        <p className="text-muted-foreground">{formatEffort(stats.totalEffortMinutes)}</p>
                      </div>
                      <div className="flex gap-1">
                        {stats.closedTickets > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            {stats.closedTickets} closed
                          </span>
                        )}
                        {stats.openTickets > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                            {stats.openTickets} open
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={(e) => handleOpenEmailDialog(stats, e)}
                        disabled={!stats.email}
                        title={stats.email ? "Send Report" : "No email address"}
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Issue type breakdown */}
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {stats.byIssueType.BR > 0 && (
                      <span className="text-xs px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded">
                        {getIssueTypeLabel('BR')}: {stats.byIssueType.BR}
                      </span>
                    )}
                    {stats.byIssueType.FR > 0 && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded">
                        {getIssueTypeLabel('FR')}: {stats.byIssueType.FR}
                      </span>
                    )}
                    {stats.byIssueType.SR > 0 && (
                      <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded">
                        {getIssueTypeLabel('SR')}: {stats.byIssueType.SR}
                      </span>
                    )}
                    {stats.byIssueType.MG > 0 && (
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 rounded">
                        {getIssueTypeLabel('MG')}: {stats.byIssueType.MG}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Email Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Preview
            </DialogTitle>
          </DialogHeader>
          
          {selectedCustomer && (
            <>
              {/* Recipients Section */}
              <div className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Recipients</span>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {primaryRecipient && (
                    <span className="inline-flex items-center gap-1 py-1 px-2 bg-secondary text-secondary-foreground rounded-md text-sm">
                      {primaryRecipient}
                      <span className="text-xs text-muted-foreground ml-1">(primary)</span>
                    </span>
                  )}
                  {additionalRecipients.map(email => (
                    <span key={email} className="inline-flex items-center gap-1 py-1 px-2 border rounded-md text-sm">
                      {email}
                      <button 
                        onClick={() => handleRemoveRecipient(email)}
                        className="ml-1 hover:text-destructive transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
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
              <div className="flex-1 min-h-0">
                <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                <ScrollArea className="h-[300px] border rounded-lg">
                  <div 
                    dangerouslySetInnerHTML={{ __html: generatePreviewHtml() }}
                    className="text-sm"
                  />
                </ScrollArea>
              </div>
            </>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendEmail} 
              disabled={isSendingEmail || !primaryRecipient}
              className="gap-2"
            >
              {isSendingEmail ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Send to {[primaryRecipient, ...additionalRecipients].filter(Boolean).length} recipient{[primaryRecipient, ...additionalRecipients].filter(Boolean).length !== 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
