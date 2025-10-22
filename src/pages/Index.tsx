import { NetworkStatus } from "@/components/NetworkStatus";
import { SyncButton } from "@/components/SyncButton";
import { ContactList } from "@/components/ContactList";
import { BackToTop } from "@/components/BackToTop";
import { AddContactForm } from "@/components/AddContactForm";
import { FollowUpReminder } from "@/components/FollowUpReminder";
import { MetricsCard } from "@/components/MetricsCard";
import { useLeadContext } from "@/contexts/LeadContext";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { LogOut, Search, X, Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const { contacts, interactions, syncData, lastSync, isLoading, searchQuery, setSearchQuery, showStarredOnly, setShowStarredOnly } = useLeadContext();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [orders, setOrders] = useState<any[]>([]);
  const [showOrdersDialog, setShowOrdersDialog] = useState(false);
  const navigate = useNavigate();

  const filteredContacts = useMemo(() => {
    let filtered = contacts;
    
    // Apply starred filter first
    if (showStarredOnly) {
      filtered = filtered.filter(contact => contact.starred);
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
  }, [contacts, searchQuery, showStarredOnly]);

  // Fetch orders
  useEffect(() => {
    const fetchOrders = async () => {
      const userId = localStorage.getItem("userId");
      const token = localStorage.getItem("userToken");
      if (!userId || !token) return;

      try {
        const response = await fetch(`https://demo.opterix.in/api/public/formwidgetdatahardcode/${userId}/${token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: 78, offset: 0, limit: 100 })
        });

        if (response.ok) {
          const result = await response.json();
          if (result.data && result.data[0] && result.data[0].body) {
            setOrders(result.data[0].body);
          }
        }
      } catch (error) {
        console.error("Failed to fetch orders:", error);
      }
    };

    fetchOrders();
  }, []);

  const metrics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    lastDayOfMonth.setHours(23, 59, 59, 999);
    
    // Today's Leads: contacts with interactions today
    const contactsWithTodayInteractions = new Set<string>();
    interactions.forEach(interaction => {
      const interactionDate = new Date(interaction.date);
      interactionDate.setHours(0, 0, 0, 0);
      if (interactionDate >= today && interactionDate < tomorrow) {
        contactsWithTodayInteractions.add(interaction.contactId);
      }
    });
    
    // Orders Closed This Month: count orders created this month
    const ordersClosedThisMonth = orders.filter(order => {
      if (!order.created) return false;
      const orderDate = new Date(order.created);
      return orderDate >= firstDayOfMonth && orderDate <= lastDayOfMonth;
    }).length;
    
    return {
      todaysLeads: contactsWithTodayInteractions.size,
      leadsClosedThisMonth: ordersClosedThisMonth
    };
  }, [contacts, interactions, orders]);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      navigate("/login");
    }

    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      syncData();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Auto-sync on mount if online
    if (navigator.onLine) {
      syncData();
    }

    // Auto-sync every hour when online
    const syncInterval = setInterval(() => {
      if (navigator.onLine) {
        syncData();
      }
    }, 60 * 60 * 1000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(syncInterval);
    };
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("userToken");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-3xl mx-auto px-3 py-2 md:px-8 md:py-4">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">
                Opterix Leads
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <NetworkStatus />
              <FollowUpReminder />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9 h-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-9 w-9"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">
                  {filteredContacts.length} {filteredContacts.length === 1 ? 'Contact' : 'Contacts'}
                  {(searchQuery || showStarredOnly) && (
                    <span className="text-xs text-muted-foreground ml-1">of {contacts.length}</span>
                  )}
                </span>
                <SyncButton lastSync={lastSync} isOnline={isOnline} />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <Button
                variant={showStarredOnly ? "default" : "secondary"}
                size="sm"
                onClick={() => setShowStarredOnly(!showStarredOnly)}
                className="h-8 px-3"
              >
                <Star className={`h-3.5 w-3.5 mr-1.5 ${showStarredOnly ? 'fill-current' : ''}`} />
                Starred
              </Button>
              <AddContactForm />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-3 py-4 md:px-8 md:py-6">
        <MetricsCard 
          todaysLeads={metrics.todaysLeads} 
          leadsClosedThisMonth={metrics.leadsClosedThisMonth}
          onClosedClick={() => setShowOrdersDialog(true)}
        />

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Loading contacts...
          </div>
        ) : (
          <ContactList contacts={filteredContacts} />
        )}
      </div>
      <BackToTop />

      <Dialog open={showOrdersDialog} onOpenChange={setShowOrdersDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Orders This Month</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] pr-4">
            {orders.filter(order => {
              if (!order.created) return false;
              const orderDate = new Date(order.created);
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
                    if (!order.created) return false;
                    const orderDate = new Date(order.created);
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
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
