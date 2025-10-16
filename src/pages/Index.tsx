import { NetworkStatus } from "@/components/NetworkStatus";
import { SyncButton } from "@/components/SyncButton";
import { ContactList } from "@/components/ContactList";
import { BackToTop } from "@/components/BackToTop";
import { AddContactForm } from "@/components/AddContactForm";
import { useLeadContext } from "@/contexts/LeadContext";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { LogOut, Search, X, Star } from "lucide-react";

const Index = () => {
  const { contacts, syncData, lastSync, isLoading, searchQuery, setSearchQuery, showStarredOnly, setShowStarredOnly } = useLeadContext();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
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
          followUpDate.includes(query)
        );
      });
    }
    
    return filtered;
  }, [contacts, searchQuery, showStarredOnly]);

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
                Lead Manager
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <NetworkStatus />
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
                variant={showStarredOnly ? "default" : "ghost"}
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

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Loading contacts...
          </div>
        ) : (
          <ContactList contacts={filteredContacts} />
        )}
      </div>
      <BackToTop />
    </div>
  );
};

export default Index;
