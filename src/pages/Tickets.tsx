import { useState, useMemo, useEffect, useDeferredValue, useRef } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useLeadContext } from "@/contexts/LeadContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Search, Plus, X, Calendar, Edit, Star, LogOut } from "lucide-react";
import { AddTicketForm } from "@/components/AddTicketForm";
import { UpdateTicketForm } from "@/components/UpdateTicketForm";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SyncButton } from "@/components/SyncButton";
import { TicketFiltersDialog } from "@/components/TicketFiltersDialog";
import { format } from "date-fns";

export default function Tickets() {
  const { tickets, contacts, updateTicket, syncTickets, syncData } = useLeadContext();
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const initialFilter = searchParams.get("filter") || "all";
  const userCompany = localStorage.getItem("userCompany"); // Check if customer
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter);
  const [issueTypeFilter, setIssueTypeFilter] = useState<string>("all");
  const [contactFilter, setContactFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<boolean | null>(null);
  const [ageFilter, setAgeFilter] = useState<"all" | "older-than-10-days">("all");
  const [selectedTicket, setSelectedTicket] = useState<typeof tickets[0] | null>(null);
  const [editingTicket, setEditingTicket] = useState<typeof tickets[0] | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const hasSynced = useRef(false);

  // Defer search query for non-blocking updates
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Defer heavy renders until after initial paint
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Track online status and last sync
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    const lastSyncStr = localStorage.getItem("lastTicketSync");
    if (lastSyncStr) {
      setLastSync(new Date(lastSyncStr));
    }
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Sync data on mount if coming from login (only for customer login)
  useEffect(() => {
    if (location.state?.shouldSync && navigator.onLine && !hasSynced.current && userCompany) {
      console.log("[TICKETS PAGE] Customer login detected, fetching contacts and tickets");
      hasSynced.current = true;
      syncData(); // Fetch contacts only for customer login
      syncTickets(); // Fetch tickets
      // Clear the state
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const handleSync = async () => {
    await Promise.all([syncData(), syncTickets()]);
    setLastSync(new Date());
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("userToken");
    localStorage.removeItem("userCompany");
    navigate("/login");
  };

  // Create contact lookup map for O(1) access
  const contactMap = useMemo(() => {
    const map = new Map<string, typeof contacts[0]>();
    contacts.forEach(contact => map.set(contact.id, contact));
    return map;
  }, [contacts]);

  // Get unique issue types for filter
  const issueTypes = useMemo(() => {
    return Array.from(new Set(tickets.map(t => t.issueType))).filter(Boolean);
  }, [tickets]);

  // Calculate metrics
  const priorityTicketsCount = useMemo(() => 
    tickets.filter(t => t.priority).length
  , [tickets]);

  const ticketsOlderThan10Days = useMemo(() => {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    return tickets.filter(t => new Date(t.reportedDate) < tenDaysAgo).length;
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    let filtered = tickets;

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    // Issue type filter
    if (issueTypeFilter !== "all") {
      filtered = filtered.filter(t => t.issueType === issueTypeFilter);
    }

    // Contact filter
    if (contactFilter !== "all") {
      filtered = filtered.filter(t => t.contactId === contactFilter);
    }

    // Priority filter
    if (priorityFilter !== null) {
      filtered = filtered.filter(t => t.priority === priorityFilter);
    }

    // Age filter
    if (ageFilter === "older-than-10-days") {
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      filtered = filtered.filter(t => new Date(t.reportedDate) < tenDaysAgo);
    }

    // Search filter - use contactMap for O(1) lookup and deferred query
    if (deferredSearchQuery.trim()) {
      const query = deferredSearchQuery.toLowerCase();
      filtered = filtered.filter(ticket => {
        const contact = contactMap.get(ticket.contactId);
        return (
          ticket.issueType.toLowerCase().includes(query) ||
          ticket.description.toLowerCase().includes(query) ||
          (contact?.name || "").toLowerCase().includes(query) ||
          (contact?.company || "").toLowerCase().includes(query)
        );
      });
    }

    // Sort by priority first, then status (open/in progress first, then closed), then by date (newest first)
    return filtered.sort((a, b) => {
      // Priority tickets come first
      if (a.priority && !b.priority) return -1;
      if (!a.priority && b.priority) return 1;
      
      const aIsClosed = a.status === "CLOSED" ? 1 : 0;
      const bIsClosed = b.status === "CLOSED" ? 1 : 0;
      
      if (aIsClosed !== bIsClosed) {
        return aIsClosed - bIsClosed;
      }
      
      return new Date(b.reportedDate).getTime() - new Date(a.reportedDate).getTime();
    });
  }, [tickets, contactMap, deferredSearchQuery, statusFilter, issueTypeFilter, contactFilter, priorityFilter, ageFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return <Badge variant="destructive">OPEN</Badge>;
      case "IN PROGRESS":
        return <Badge variant="secondary">IN PROGRESS</Badge>;
      case "CLOSED":
        return <Badge variant="outline">CLOSED</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleStatusChange = async (ticketId: string, newStatus: "OPEN" | "IN PROGRESS" | "CLOSED") => {
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    const updatedTicket = {
      ...ticket,
      status: newStatus,
      closedDate: newStatus === "CLOSED" ? new Date().toISOString() : ticket.closedDate,
    };

    await updateTicket(updatedTicket);
  };

  const handleTogglePriority = async (ticketId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    const updatedTicket = {
      ...ticket,
      priority: !ticket.priority,
    };

    await updateTicket(updatedTicket);
  };

  return (
    <div className="min-h-screen bg-textured">
      <div className="sticky top-0 z-10 bg-textured backdrop-blur-sm border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {!userCompany && (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/")}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <h1 className="text-lg font-semibold text-foreground">Tickets</h1>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {userCompany && (
                <Button variant="outline" size="icon" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
              <AddTicketForm />
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-12 h-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-10 top-1/2 transform -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
            <TicketFiltersDialog
              statusFilter={statusFilter}
              issueTypeFilter={issueTypeFilter}
              contactFilter={contactFilter}
              onStatusChange={setStatusFilter}
              onIssueTypeChange={setIssueTypeFilter}
              onContactChange={setContactFilter}
              issueTypes={issueTypes}
              contacts={contacts}
              mounted={mounted}
            />
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Card 
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => {
                setPriorityFilter(priorityFilter === true ? null : true);
                setAgeFilter("all");
              }}
            >
              <CardContent className="p-4 flex flex-col">
                <p className="text-xs text-muted-foreground mb-2 h-8 flex items-start">Priority Tickets</p>
                <p className="text-2xl font-bold text-foreground">{priorityTicketsCount}</p>
              </CardContent>
            </Card>
            <Card 
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => {
                setAgeFilter(ageFilter === "older-than-10-days" ? "all" : "older-than-10-days");
                setPriorityFilter(null);
              }}
            >
              <CardContent className="p-4 flex flex-col">
                <p className="text-xs text-muted-foreground mb-2 h-8 flex items-start">Tickets &gt;10 Days</p>
                <p className="text-2xl font-bold text-foreground">{ticketsOlderThan10Days}</p>
              </CardContent>
            </Card>
          </div>

          {/* Count and Sync */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground">
                {filteredTickets.length} {filteredTickets.length === 1 ? 'Ticket' : 'Tickets'}
              </span>
              <SyncButton lastSync={lastSync} isOnline={isOnline} onSync={handleSync} />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {filteredTickets.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {tickets.length === 0 ? "No tickets yet" : "No tickets match your filters"}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredTickets.map(ticket => {
              const contact = contactMap.get(ticket.contactId);
              return (
                <Card
                  key={`${ticket.id}-${ticket.ticketId || ''}`}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => setSelectedTicket(ticket)}
                >
                   <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 p-0"
                            onClick={(e) => handleTogglePriority(ticket.id, e)}
                          >
                            <Star 
                              className={`h-4 w-4 ${ticket.priority ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}`}
                            />
                          </Button>
                          {getStatusBadge(ticket.status)}
                          <Badge variant="outline">{ticket.issueType}</Badge>
                        </div>
                        <h3 className="font-semibold text-foreground truncate">
                          {contact?.name || "Unknown Contact"}
                        </h3>
                        {contact?.company && (
                          <p className="text-sm text-muted-foreground">{contact.company}</p>
                        )}
                      </div>
                       <div onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={ticket.status}
                          onValueChange={(value) => handleStatusChange(ticket.id, value as any)}
                        >
                          <SelectTrigger className="w-24 sm:w-32 text-xs sm:text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OPEN">OPEN</SelectItem>
                            <SelectItem value="IN PROGRESS">IN PROGRESS</SelectItem>
                            <SelectItem value="CLOSED">CLOSED</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-foreground line-clamp-2 mb-3">
                      {ticket.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>Reported: {format(new Date(ticket.reportedDate), "MMM d, yyyy")}</span>
                      </div>
                      {ticket.targetDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Target: {format(new Date(ticket.targetDate), "MMM d, yyyy")}</span>
                        </div>
                      )}
                      {ticket.screenshots.length > 0 && (
                        <span>{ticket.screenshots.length} screenshot{ticket.screenshots.length > 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Ticket Details Dialog */}
      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[85vh] p-4 sm:p-6">
          {selectedTicket && (
            <>
              <DialogHeader>
                <DialogTitle>Ticket Details</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh] pr-4">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      {getStatusBadge(selectedTicket.status)}
                      <Badge variant="outline">{selectedTicket.issueType}</Badge>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-1">
                      {contactMap.get(selectedTicket.contactId)?.name || "Unknown Contact"}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {contactMap.get(selectedTicket.contactId)?.company}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Reported:</span>
                      <span className="text-foreground">
                        {format(new Date(selectedTicket.reportedDate), "PPP")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Target Date:</span>
                      <span className="text-foreground">
                        {format(new Date(selectedTicket.targetDate), "PPP")}
                      </span>
                    </div>
                    {selectedTicket.closedDate && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Closed:</span>
                        <span className="text-foreground">
                          {format(new Date(selectedTicket.closedDate), "PPP")}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">Description</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedTicket.description}
                    </p>
                  </div>

                  {selectedTicket.remarks && (
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-2">Remarks / Analysis</h4>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selectedTicket.remarks}
                      </p>
                    </div>
                  )}

                   {selectedTicket.screenshots.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-3">Screenshots</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                        {selectedTicket.screenshots.map((screenshot, idx) => (
                          <div
                            key={idx}
                            className="relative w-full aspect-[4/3] rounded-lg border border-border overflow-hidden cursor-pointer hover:opacity-80 transition-opacity bg-muted flex items-center justify-center"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFullScreenImage(screenshot);
                            }}
                          >
                            <img
                              src={screenshot}
                              alt={`Screenshot ${idx + 1}`}
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {selectedTicket.rootCause && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">Root Cause</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedTicket.rootCause}
                    </p>
                  </div>
                )}
              </ScrollArea>
              <Button 
                className="w-full mt-4"
                onClick={() => {
                  setEditingTicket(selectedTicket);
                  setSelectedTicket(null);
                }}
              >
                <Edit className="h-4 w-4 mr-2" />
                Update Ticket
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Ticket Dialog */}
      {editingTicket && (
        <UpdateTicketForm
          ticket={editingTicket}
          open={!!editingTicket}
          onOpenChange={(open) => !open && setEditingTicket(null)}
        />
      )}

      {/* Full Screen Image Dialog */}
      <Dialog open={!!fullScreenImage} onOpenChange={(open) => !open && setFullScreenImage(null)}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] w-auto p-4 overflow-auto">
          <div className="flex items-center justify-center">
            <img
              src={fullScreenImage || ""}
              alt="Full screen screenshot"
              className="max-w-full max-h-[85vh] w-auto h-auto object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
