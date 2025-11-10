import { NetworkStatus } from "@/components/NetworkStatus";
import { SyncButton } from "@/components/SyncButton";
import { ContactList } from "@/components/ContactList";
import { BackToTop } from "@/components/BackToTop";
import { AddContactForm } from "@/components/AddContactForm";
import { FollowUpReminder } from "@/components/FollowUpReminder";
import { MetricsCard } from "@/components/MetricsCard";
import { TicketsWidget } from "@/components/TicketsWidget";
import { AdvancedSearchDialog, AdvancedFilters } from "@/components/AdvancedSearchDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FeatureTour } from "@/components/FeatureTour";
import { UserProfile } from "@/components/UserProfile";
import { useLeadContext } from "@/contexts/LeadContext";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, useLocation } from "react-router-dom";
import { Search, X, Star, HelpCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const { contacts, interactions, orders, syncData, fetchOrders, lastSync, isLoading, searchQuery, setSearchQuery, showStarredOnly, setShowStarredOnly, advancedFilters, setAdvancedFilters } = useLeadContext();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOrdersDialog, setShowOrdersDialog] = useState(false);
  const [showInteractionsDialog, setShowInteractionsDialog] = useState(false);
  const [showTour, setShowTour] = useState(false);

  const tourSteps = [
    {
      target: '[data-tour="search"]',
      title: "Search & Filter",
      description: "Search contacts by name, company, or email. Use advanced filters to narrow down your results.",
      position: "bottom" as const,
    },
    {
      target: '[data-tour="metrics"]',
      title: "Key Metrics",
      description: "Track today's interactions and this month's order values at a glance.",
      position: "bottom" as const,
    },
    {
      target: '[data-tour="starred"]',
      title: "Starred Contacts",
      description: "Toggle to view only your starred/favorite contacts for quick access.",
      position: "top" as const,
    },
    {
      target: '[data-tour="add-contact"]',
      title: "Add Contacts",
      description: "Quickly add new contacts with their details and assign them a status.",
      position: "left" as const,
    },
    {
      target: '[data-tour="sync"]',
      title: "Sync Data",
      description: "Keep your data synchronized with the server. The indicator shows your connection status.",
      position: "left" as const,
    },
    {
      target: '[data-tour="contact-actions"]',
      title: "Contact Actions",
      description: "Each contact has a star button to mark favorites and a down arrow to drop/archive contacts for later.",
      position: "top" as const,
    },
  ];

  useEffect(() => {
    const hasSeenTour = localStorage.getItem("hasSeenTour");
    if (!hasSeenTour && contacts.length > 0) {
      setTimeout(() => setShowTour(true), 1000);
    }
  }, [contacts.length]);
  const navigate = useNavigate();
  const location = useLocation();

  // Create contact lookup map for O(1) access
  const contactMap = useMemo(() => {
    const map = new Map<string, typeof contacts[0]>();
    contacts.forEach(contact => map.set(contact.id, contact));
    return map;
  }, [contacts]);

  const filteredContacts = useMemo(() => {
    let filtered = contacts;
    
    // Apply starred filter first
    if (showStarredOnly) {
      filtered = filtered.filter(contact => contact.starred);
    }
    
    // Apply advanced filters
    if (advancedFilters.statuses.length > 0) {
      filtered = filtered.filter(contact => 
        advancedFilters.statuses.includes(contact.status)
      );
    }
    
    if (advancedFilters.city) {
      filtered = filtered.filter(contact => 
        contact.city.toLowerCase() === advancedFilters.city.toLowerCase()
      );
    }
    
    if (advancedFilters.dateFrom || advancedFilters.dateTo) {
      filtered = filtered.filter(contact => {
        if (!contact.followup_on) return false;
        const contactDate = new Date(contact.followup_on);
        contactDate.setHours(0, 0, 0, 0);
        
        if (advancedFilters.dateFrom) {
          const fromDate = new Date(advancedFilters.dateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (contactDate < fromDate) return false;
        }
        
        if (advancedFilters.dateTo) {
          const toDate = new Date(advancedFilters.dateTo);
          toDate.setHours(23, 59, 59, 999);
          if (contactDate > toDate) return false;
        }
        
        return true;
      });
    }
    
    // Then apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(contact => {
        const followUpDate = new Date(contact.followup_on).toLocaleDateString().toLowerCase();
        return (
          contact.name.toLowerCase().includes(query) ||
          contact.company.toLowerCase().includes(query) ||
          contact.city.toLowerCase().includes(query) ||
          contact.status.toLowerCase().includes(query) ||
          (contact.profile && contact.profile.toLowerCase().includes(query)) ||
          (contact.phone && contact.phone.toLowerCase().includes(query)) ||
          (contact.email && contact.email.toLowerCase().includes(query)) ||
          followUpDate.includes(query)
        );
      });
    }
    
    // Sort by follow-up date (earliest first, empty/invalid dates at the end)
    return filtered.sort((a, b) => {
      const dateA = a.followup_on ? new Date(a.followup_on).getTime() : Infinity;
      const dateB = b.followup_on ? new Date(b.followup_on).getTime() : Infinity;
      return dateA - dateB;
    });
  }, [contacts, searchQuery, showStarredOnly, advancedFilters]);

  // Fetch orders only when clicking "Closed This Month"
  const handleClosedClick = async () => {
    await fetchOrders();
    setShowOrdersDialog(true);
  };

  // Helper function to get buyer name from contacts
  const getBuyerName = (buyerId: string) => {
    const contact = contactMap.get(buyerId);
    return contact ? contact.name : 'Unknown Buyer';
  };

  // Show today's interactions
  const handleTodaysClick = () => {
    setShowInteractionsDialog(true);
  };

  // Compute metrics efficiently - memoize date objects
  const dateRanges = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    lastDayOfMonth.setHours(23, 59, 59, 999);
    
    return { today, tomorrow, firstDayOfMonth, lastDayOfMonth };
  }, []);

  const metrics = useMemo(() => {
    const { today, tomorrow, firstDayOfMonth, lastDayOfMonth } = dateRanges;
    
    // Count today's interactions
    let todaysCount = 0;
    for (const interaction of interactions) {
      const date = new Date(interaction.date);
      date.setHours(0, 0, 0, 0);
      if (date >= today && date < tomorrow) {
        todaysCount++;
      }
    }
    
    // Sum this month's order values
    let orderValueThisMonth = 0;
    for (const order of orders) {
      if (order.sodate) {
        const orderDate = new Date(order.sodate);
        if (orderDate >= firstDayOfMonth && orderDate <= lastDayOfMonth) {
          orderValueThisMonth += parseFloat(order.total_basic) || 0;
        }
      }
    }
    
    return {
      todaysInteractions: todaysCount,
      leadsClosedThisMonth: orderValueThisMonth
    };
  }, [interactions, orders, dateRanges]);

  // Get today's interactions list (only when dialog is shown)
  const todaysInteractions = useMemo(() => {
    if (!showInteractionsDialog) return [];
    
    const { today, tomorrow } = dateRanges;
    return interactions.filter(interaction => {
      const date = new Date(interaction.date);
      date.setHours(0, 0, 0, 0);
      return date >= today && date < tomorrow;
    });
  }, [interactions, dateRanges, showInteractionsDialog]);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      navigate("/login");
      return;
    }

    // Only sync if coming from login
    if (location.state?.shouldSync && navigator.onLine) {
      syncData();
      fetchOrders();
      // Clear the state
      window.history.replaceState({}, document.title);
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [navigate, location.state, syncData, fetchOrders]);

  const handleLogout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("userToken");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-textured">
      {showTour && (
        <FeatureTour
          steps={tourSteps}
          onComplete={() => {
            setShowTour(false);
            localStorage.setItem("hasSeenTour", "true");
          }}
          onSkip={() => {
            setShowTour(false);
            localStorage.setItem("hasSeenTour", "true");
          }}
        />
      )}
      
      <div className="sticky top-0 z-10 bg-textured backdrop-blur-sm border-b border-border shadow-sm">
        <div className="max-w-3xl mx-auto px-3 py-2 md:px-8 md:py-4">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">
                Opterix 360
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <NetworkStatus />
              <FollowUpReminder />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowTour(true)}
                className="h-8 w-8"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
              <UserProfile onLogout={handleLogout} />
            </div>
          </div>

          <div className="relative mb-3" data-tour="search">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-20 h-9"
            />
            <div className="absolute right-0 top-0 h-9 flex items-center gap-0.5 pr-0.5">
              <AdvancedSearchDialog
                contacts={contacts}
                filters={advancedFilters}
                onApplyFilters={setAdvancedFilters}
                onClearFilters={() => setAdvancedFilters({
                  statuses: [],
                  city: "",
                  dateFrom: undefined,
                  dateTo: undefined
                })}
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">
                  {filteredContacts.length} {filteredContacts.length === 1 ? 'Contact' : 'Contacts'}
                  {(searchQuery || showStarredOnly || advancedFilters.statuses.length > 0 || advancedFilters.city || advancedFilters.dateFrom || advancedFilters.dateTo) && (
                    <span className="text-xs text-muted-foreground ml-1">of {contacts.length}</span>
                  )}
                </span>
                <div data-tour="sync">
                  <SyncButton lastSync={lastSync} isOnline={isOnline} />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div data-tour="starred">
                <Button
                  variant={showStarredOnly ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setShowStarredOnly(!showStarredOnly)}
                  className="h-8 px-3"
                >
                  <Star className={`h-3.5 w-3.5 mr-1.5 ${showStarredOnly ? 'fill-current' : ''}`} />
                  Starred
                </Button>
              </div>
              <div data-tour="add-contact">
                <AddContactForm />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-3 py-4 md:px-8 md:py-6">
        <div data-tour="metrics" className="grid grid-cols-3 gap-2 md:gap-3 mb-4">
          <MetricsCard 
            todaysInteractions={metrics.todaysInteractions} 
            leadsClosedThisMonth={metrics.leadsClosedThisMonth}
            onTodaysClick={handleTodaysClick}
            onClosedClick={handleClosedClick}
          />
          <TicketsWidget />
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Loading contacts...
          </div>
        ) : (
          <ContactList contacts={filteredContacts} />
        )}
      </div>
      <BackToTop />

      <Dialog open={showInteractionsDialog} onOpenChange={setShowInteractionsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Today's Interactions</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            {todaysInteractions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No interactions today
              </div>
            ) : (
              <div className="space-y-4">
                {todaysInteractions.map((interaction, index) => {
                  const contact = contactMap.get(interaction.contactId);
                  return (
                    <div key={index} className="border rounded-lg p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-foreground">
                            {contact?.name || 'Unknown Contact'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {contact?.company || 'No Company'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(interaction.date).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-foreground">{interaction.notes}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={showOrdersDialog} onOpenChange={setShowOrdersDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Sales Orders</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="this-month" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="this-month">This Month</TabsTrigger>
              <TabsTrigger value="all">All Orders</TabsTrigger>
            </TabsList>
            
            <TabsContent value="this-month">
              <ScrollArea className="h-[55vh] pr-4">
                {orders.filter(order => {
                  if (!order.sodate) return false;
                  const orderDate = new Date(order.sodate);
                  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                  const lastDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
                  return orderDate >= firstDayOfMonth && orderDate <= lastDayOfMonth;
                }).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No orders this month
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders
                      .filter(order => {
                        if (!order.sodate) return false;
                        const orderDate = new Date(order.sodate);
                        const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                        const lastDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
                        return orderDate >= firstDayOfMonth && orderDate <= lastDayOfMonth;
                      })
                      .map((order, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-foreground">
                              {order.po_no || 'No Order Number'}
                            </p>
                            <p className="text-sm font-medium text-foreground">
                              {order.buyer ? getBuyerName(order.buyer) : 'No Buyer'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {order.sodate ? new Date(order.sodate).toLocaleDateString() : 'No Date'}
                            </p>
                          </div>
                          <p className="text-lg font-bold text-primary">
                            ₹{order.total_basic ? parseFloat(order.total_basic).toLocaleString() : '0'}
                          </p>
                        </div>
                        {order.comment && (
                          <p className="text-sm text-muted-foreground">{order.comment}</p>
                        )}
                      </div>
                      ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="all">
              <ScrollArea className="h-[55vh] pr-4">
                {orders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No orders found
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order, index) => (
                      <div key={index} className="border rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-foreground">
                              {order.po_no || 'No Order Number'}
                            </p>
                            <p className="text-sm font-medium text-foreground">
                              {order.buyer ? getBuyerName(order.buyer) : 'No Buyer'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {order.sodate ? new Date(order.sodate).toLocaleDateString() : 'No Date'}
                            </p>
                          </div>
                          <p className="text-lg font-bold text-primary">
                            ₹{order.total_basic ? parseFloat(order.total_basic).toLocaleString() : '0'}
                          </p>
                        </div>
                        {order.comment && (
                          <p className="text-sm text-muted-foreground">{order.comment}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      
      <footer className="mt-8 pb-4 text-center">
        <p className="text-xs text-muted-foreground">
          © Copyright ProductRx Consulting Pvt Ltd. All rights reserved.
        </p>
      </footer>
    </div>
  );
};

export default Index;
