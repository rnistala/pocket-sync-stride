import { useLeadContext } from "@/contexts/LeadContext";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronRight, Ticket, Clock, CheckCircle, AlertCircle, BarChart3, Mail, Loader2, X, Plus, Users, ChevronDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  const { contacts, tickets, isLoading } = useLeadContext();
  
  // Month filter - default to current month
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Email dialog state
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerStats | null>(null);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [isMessageOpen, setIsMessageOpen] = useState(false);
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

  // Open email dialog for a customer
  const handleOpenEmailDialog = (customer: CustomerStats, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCustomer(customer);
    setEmailSubject(`[Opterix 360] Monthly Performance Summary - ${customer.company} - ${selectedMonthLabel}`);
    setCustomMessage("");
    setAdditionalRecipients([]);
    setNewRecipientEmail("");
    setIsMessageOpen(false);
    setIsEmailDialogOpen(true);
  };

  // Add recipient
  const handleAddRecipient = () => {
    const email = newRecipientEmail.trim();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !additionalRecipients.includes(email)) {
      setAdditionalRecipients([...additionalRecipients, email]);
      setNewRecipientEmail("");
    }
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
      
      // Prepare all recipients
      const allRecipients = [selectedCustomer.email, ...additionalRecipients].filter(Boolean).join(", ");
      
      // Prepare tickets for email
      const ticketSummaries = closedTickets.map(ticket => ({
        description: ticket.description,
        rootCause: ticket.rootCause || "Unspecified",
        effort: formatEffort(Number(ticket.effort_minutes) || 0),
        closedDate: ticket.closedDate ? formatDateShort(ticket.closedDate) : "-",
      }));

      const payload = [{
        companyName: selectedCustomer.company,
        recipientEmail: allRecipients,
        subject: emailSubject,
        month: selectedMonthLabel,
        totalTickets: selectedCustomer.totalTickets,
        closedTickets: selectedCustomer.closedTickets,
        openTickets: selectedCustomer.openTickets,
        totalEffort: formatEffort(selectedCustomer.totalEffortMinutes),
        effortByRootCause: selectedCustomer.effortByRootCause,
        tickets: ticketSummaries,
        customMessage: customMessage.trim() || undefined,
      }];

      const { error } = await supabase.functions.invoke('send-dashboard-email', {
        body: payload,
      });

      if (error) throw error;

      toast.success(`Report sent to ${allRecipients}`);
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
          <h2 className="text-lg font-semibold">{totals.customers} Customers with Tickets</h2>
          
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Send Report
            </DialogTitle>
          </DialogHeader>
          
          {selectedCustomer && (
            <div className="space-y-4">
              {/* Company name */}
              <div className="text-sm font-medium text-muted-foreground">
                Report for: <span className="text-foreground">{selectedCustomer.company}</span>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject</label>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Email subject"
                />
              </div>

              {/* Custom message */}
              <Collapsible open={isMessageOpen} onOpenChange={setIsMessageOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between px-0 hover:bg-transparent">
                    <span className="text-sm font-medium">Add message to report</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isMessageOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder="Add a personalized message to include at the top of the report..."
                    className="mt-2"
                    rows={3}
                  />
                </CollapsibleContent>
              </Collapsible>

              {/* Recipients */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Recipients
                </label>
                <div className="space-y-2">
                  {/* Primary recipient */}
                  <div className="flex items-center gap-2 text-sm bg-muted/50 px-3 py-2 rounded-md">
                    <span className="flex-1 truncate">{selectedCustomer.email || "No email"}</span>
                    <span className="text-xs text-muted-foreground">(Primary)</span>
                  </div>
                  
                  {/* Additional recipients */}
                  {additionalRecipients.map((email) => (
                    <div key={email} className="flex items-center gap-2 text-sm bg-muted/50 px-3 py-2 rounded-md">
                      <span className="flex-1 truncate">{email}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleRemoveRecipient(email)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  
                  {/* Add recipient input */}
                  <div className="flex gap-2">
                    <Input
                      value={newRecipientEmail}
                      onChange={(e) => setNewRecipientEmail(e.target.value)}
                      placeholder="Add another email..."
                      onKeyDown={(e) => e.key === 'Enter' && handleAddRecipient()}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleAddRecipient}
                      disabled={!newRecipientEmail.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Summary preview */}
              <div className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-medium mb-1">Report Summary</p>
                <p className="text-muted-foreground">
                  {selectedCustomer.totalTickets} tickets · {selectedCustomer.closedTickets} closed · {formatEffort(selectedCustomer.totalEffortMinutes)} effort
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSendEmail} 
              disabled={isSendingEmail || !selectedCustomer?.email}
            >
              {isSendingEmail ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Report
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
