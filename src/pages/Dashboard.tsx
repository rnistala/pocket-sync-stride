import { useLeadContext } from "@/contexts/LeadContext";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronRight, Ticket, Clock, CheckCircle, AlertCircle, BarChart3 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getIssueTypeLabel } from "@/lib/issueTypeUtils";
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

  // Filter tickets by selected month
  const filteredTickets = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
    
    return tickets.filter(ticket => {
      const ticketDate = new Date(ticket.reportedDate);
      return ticketDate >= startOfMonth && ticketDate <= endOfMonth;
    });
  }, [tickets, selectedMonth]);

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
        });
      }
      
      const stats = statsMap.get(ticket.contactId)!;
      stats.totalTickets++;
      stats.totalEffortMinutes += Number(ticket.effort_minutes) || 0;
      
      // Count by status
      switch (ticket.status) {
        case "OPEN":
          stats.openTickets++;
          break;
        case "IN PROGRESS":
          stats.inProgressTickets++;
          break;
        case "CLOSED":
          stats.closedTickets++;
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
  }, [filteredTickets, contacts]);

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
                        {stats.openTickets + stats.inProgressTickets > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                            {stats.openTickets + stats.inProgressTickets} open
                          </span>
                        )}
                      </div>
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
    </div>
  );
};

export default Dashboard;
