import { useLeadContext, Ticket } from "@/contexts/LeadContext";
import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Ticket as TicketIcon, Clock, CheckCircle, AlertCircle, Loader2, ChevronDown, MessageSquare } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getIssueTypeLabel } from "@/lib/issueTypeUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import opterixLogoDark from "@/assets/opterix-logo-dark.png";
import opterixLogoLight from "@/assets/opterix-logo-light.png";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";

const formatEffort = (minutes: number): string => {
  if (minutes === 0) return "0h";
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
};

const getIssueTypeBadge = (issueType: string) => {
  const label = getIssueTypeLabel(issueType);
  switch (issueType) {
    case "BR":
      return <Badge variant="outline" className="border-red-300 text-red-700 dark:border-red-700 dark:text-red-400">{label}</Badge>;
    case "FR":
      return <Badge variant="outline" className="border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400">{label}</Badge>;
    case "SR":
      return <Badge variant="outline" className="border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-400">{label}</Badge>;
    case "MG":
      return <Badge variant="outline" className="border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-400">{label}</Badge>;
    default:
      return <Badge variant="outline">{label}</Badge>;
  }
};

const getRootCauseBadge = (rootCause: string | undefined) => {
  const cause = rootCause || "Unspecified";
  switch (cause) {
    case "Software":
      return <Badge variant="outline" className="border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400">{cause}</Badge>;
    case "Data":
      return <Badge variant="outline" className="border-orange-300 text-orange-700 dark:border-orange-700 dark:text-orange-400">{cause}</Badge>;
    case "Usage":
      return <Badge variant="outline" className="border-green-300 text-green-700 dark:border-green-700 dark:text-green-400">{cause}</Badge>;
    case "New Work":
      return <Badge variant="outline" className="border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-400">{cause}</Badge>;
    case "Meeting":
      return <Badge variant="outline" className="border-teal-300 text-teal-700 dark:border-teal-700 dark:text-teal-400">{cause}</Badge>;
    default:
      return <Badge variant="outline" className="border-gray-300 text-gray-500 dark:border-gray-600 dark:text-gray-400">{cause}</Badge>;
  }
};


const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { id: contactId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { contacts, tickets, isLoading } = useLeadContext();
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  
  // Month filter from URL or default to current month
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const urlMonth = searchParams.get('month');
    if (urlMonth) return urlMonth;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

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

  const contact = useMemo(() => {
    return contacts.find(c => c.id === contactId);
  }, [contacts, contactId]);

  // Filter tickets for this customer and selected month
  const customerTickets = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
    
    return tickets
      .filter(ticket => {
        if (ticket.contactId !== contactId) return false;
        const ticketDate = new Date(ticket.reportedDate);
        return ticketDate >= startOfMonth && ticketDate <= endOfMonth;
      })
      .sort((a, b) => new Date(b.reportedDate).getTime() - new Date(a.reportedDate).getTime());
  }, [tickets, contactId, selectedMonth]);

  // Filter only closed tickets
  const closedTickets = useMemo(() => {
    return customerTickets.filter(t => t.status === "CLOSED");
  }, [customerTickets]);

  // Calculate stats
  const stats = useMemo(() => {
    const result = {
      totalTickets: customerTickets.length,
      openTickets: 0,
      closedTickets: 0,
      inProgressTickets: 0,
      clientQueryTickets: 0,
      totalEffortMinutes: 0,
      byIssueType: { BR: 0, FR: 0, SR: 0, MG: 0 } as Record<string, number>,
      effortByIssueType: { BR: 0, FR: 0, SR: 0, MG: 0 } as Record<string, number>,
      byRootCause: { Software: 0, Data: 0, Usage: 0, "New Work": 0, Meeting: 0, Unspecified: 0 } as Record<string, number>,
      effortByRootCause: { Software: 0, Data: 0, Usage: 0, "New Work": 0, Meeting: 0, Unspecified: 0 } as Record<string, number>,
    };
    
    customerTickets.forEach(ticket => {
      result.totalEffortMinutes += Number(ticket.effort_minutes) || 0;
      
      switch (ticket.status) {
        case "OPEN":
          result.openTickets++;
          break;
        case "IN PROGRESS":
          result.inProgressTickets++;
          break;
        case "CLOSED":
          result.closedTickets++;
          // Count root cause and effort only for closed tickets
          const rootCause = ticket.rootCause || "Unspecified";
          const ticketEffort = Number(ticket.effort_minutes) || 0;
          if (rootCause in result.byRootCause) {
            result.byRootCause[rootCause]++;
            result.effortByRootCause[rootCause] += ticketEffort;
          } else {
            result.byRootCause["Unspecified"]++;
            result.effortByRootCause["Unspecified"] += ticketEffort;
          }
          break;
        case "CLIENT QUERY":
          result.clientQueryTickets++;
          break;
      }
      
      const issueType = ticket.issueType;
      if (issueType in result.byIssueType) {
        result.byIssueType[issueType]++;
        result.effortByIssueType[issueType] += Number(ticket.effort_minutes) || 0;
      }
    });
    
    return result;
  }, [customerTickets]);


  const selectedMonthLabel = monthOptions.find(m => m.value === selectedMonth)?.label || '';

  // Calculate percentages for progress bars
  const closedPercentage = stats.totalTickets > 0 ? (stats.closedTickets / stats.totalTickets) * 100 : 0;
  const openPercentage = stats.totalTickets > 0 ? ((stats.openTickets + stats.inProgressTickets + stats.clientQueryTickets) / stats.totalTickets) * 100 : 0;

  const handleSendEmail = async () => {
    if (!contact?.email) {
      toast.error("No email address found for this customer");
      return;
    }

    const userId = localStorage.getItem("userId");
    if (!userId) {
      toast.error("User not logged in");
      return;
    }

    setIsSendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-dashboard-email', {
        body: {
          userId,
          contactEmail: contact.email,
          contactName: contact.name,
          companyName: contact.company,
          monthLabel: selectedMonthLabel,
          customMessage: customMessage.trim() || undefined,
          stats: {
            totalTickets: stats.totalTickets,
            closedTickets: stats.closedTickets,
            openTickets: stats.openTickets + stats.inProgressTickets,
            totalEffortMinutes: stats.totalEffortMinutes,
            byIssueType: stats.byIssueType,
            effortByIssueType: stats.effortByIssueType,
          },
          tickets: customerTickets.map(t => ({
            ticketId: t.ticketId || `#${t.id}`,
            issueType: getIssueTypeLabel(t.issueType),
            description: t.description,
            status: t.status,
            effortMinutes: Number(t.effort_minutes) || 0,
            reportedDate: t.reportedDate,
            closedDate: t.closedDate,
          })),
        },
      });

      if (error) throw error;
      
      if (data?.success) {
        toast.success("Dashboard report sent to " + contact.email);
      } else {
        throw new Error(data?.error || "Failed to send email");
      }
    } catch (error: any) {
      console.error("Error sending dashboard email:", error);
      toast.error("Failed to send email: " + error.message);
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

  if (!contact) {
    return (
      <div className="min-h-screen bg-textured flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Customer not found</p>
        <Button onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
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
              <Button variant="ghost" size="icon" onClick={() => navigate(`/dashboard?month=${selectedMonth}`)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <img src={opterixLogoDark} alt="Opterix 360" className="h-6 dark:hidden" />
                <img src={opterixLogoLight} alt="Opterix 360" className="h-6 hidden dark:block" />
              </div>
            </div>
            <Button 
              onClick={handleSendEmail} 
              disabled={isSendingEmail || !contact.email}
              className="gap-2"
            >
              {isSendingEmail ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Send Report
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-3 py-4 md:px-8 md:py-6">
        {/* Customer header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl font-bold">{contact.company}</h1>
            <p className="text-muted-foreground">{contact.name}</p>
            {contact.email && (
              <p className="text-sm text-muted-foreground">{contact.email}</p>
            )}
          </div>
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

        {/* Custom message panel */}
        <Card className="mb-6">
          <Collapsible open={isMessageOpen} onOpenChange={setIsMessageOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-medium">Add message to report</CardTitle>
                    {customMessage.trim() && (
                      <Badge variant="secondary" className="text-xs">Message added</Badge>
                    )}
                  </div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isMessageOpen ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 pb-4">
                <Textarea
                  placeholder="Enter a personalized message to include at the top of the email report..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="min-h-[100px] resize-none"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  This message will appear at the top of the email, before the statistics.
                </p>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Summary cards with progress indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <TicketIcon className="h-4 w-4" />
                <span>Total Tickets</span>
              </div>
              <p className="text-3xl font-bold mt-1">{stats.totalTickets}</p>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: '100%' }} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Clock className="h-4 w-4" />
                <span>Total Effort</span>
              </div>
              <p className="text-3xl font-bold mt-1">{formatEffort(stats.totalEffortMinutes)}</p>
              <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (stats.totalEffortMinutes / 480) * 100)}%` }} />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Closed</span>
              </div>
              <p className="text-3xl font-bold mt-1 text-green-600 dark:text-green-400">{stats.closedTickets}</p>
              <Progress value={closedPercentage} className="mt-2 h-2 [&>div]:bg-green-500" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <span>Open</span>
              </div>
              <p className="text-3xl font-bold mt-1 text-orange-600 dark:text-orange-400">{stats.openTickets + stats.inProgressTickets + stats.clientQueryTickets}</p>
              <Progress value={openPercentage} className="mt-2 h-2 [&>div]:bg-orange-500" />
            </CardContent>
          </Card>
        </div>


        {/* Root cause breakdown (closed tickets only) */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Effort by Root Cause (Closed Tickets)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400">Software</p>
                <p className="text-lg font-bold">{stats.byRootCause.Software} tickets</p>
                <p className="text-sm text-muted-foreground">{formatEffort(stats.effortByRootCause.Software)}</p>
              </div>
              <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30">
                <p className="text-sm font-medium text-orange-700 dark:text-orange-400">Data</p>
                <p className="text-lg font-bold">{stats.byRootCause.Data} tickets</p>
                <p className="text-sm text-muted-foreground">{formatEffort(stats.effortByRootCause.Data)}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                <p className="text-sm font-medium text-green-700 dark:text-green-400">Usage</p>
                <p className="text-lg font-bold">{stats.byRootCause.Usage} tickets</p>
                <p className="text-sm text-muted-foreground">{formatEffort(stats.effortByRootCause.Usage)}</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30">
                <p className="text-sm font-medium text-purple-700 dark:text-purple-400">New Work</p>
                <p className="text-lg font-bold">{stats.byRootCause["New Work"]} tickets</p>
                <p className="text-sm text-muted-foreground">{formatEffort(stats.effortByRootCause["New Work"])}</p>
              </div>
              <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-950/30">
                <p className="text-sm font-medium text-teal-700 dark:text-teal-400">Meeting</p>
                <p className="text-lg font-bold">{stats.byRootCause.Meeting} tickets</p>
                <p className="text-sm text-muted-foreground">{formatEffort(stats.effortByRootCause.Meeting)}</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-400">Unspecified</p>
                <p className="text-lg font-bold">{stats.byRootCause.Unspecified} tickets</p>
                <p className="text-sm text-muted-foreground">{formatEffort(stats.effortByRootCause.Unspecified)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Closed Tickets list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Closed Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            {closedTickets.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No closed tickets for {selectedMonthLabel}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket ID</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Root Cause</TableHead>
                      <TableHead>Effort</TableHead>
                      <TableHead>Reported</TableHead>
                      <TableHead>Closed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {closedTickets.map(ticket => (
                      <TableRow key={ticket.id} className="align-top">
                        <TableCell className="font-mono text-sm">
                          {ticket.ticketId || `#${ticket.id}`}
                        </TableCell>
                        <TableCell className="whitespace-pre-wrap break-words">
                          {ticket.description}
                        </TableCell>
                        <TableCell>{getRootCauseBadge(ticket.rootCause)}</TableCell>
                        <TableCell>{formatEffort(Number(ticket.effort_minutes) || 0)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(ticket.reportedDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {ticket.closedDate ? new Date(ticket.closedDate).toLocaleDateString() : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CustomerDashboard;
