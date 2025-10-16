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
  const { contacts, syncData, lastSync, isLoading, searchQuery, setSearchQuery } = useLeadContext();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
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
        const followUpDate = new Date(contact.nextFollowUp).toLocaleDateString().toLowerCase();
        return (
          contact.name.toLowerCase().includes(query) ||
          contact.company.toLowerCase().includes(query) ||
          contact.city.toLowerCase().includes(query) ||
          contact.status.toLowerCase().includes(query) ||
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

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("userId");
    localStorage.removeItem("userToken");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Lead Manager
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage your leads offline, sync when connected
              </p>
            </div>
            <div className="flex items-center gap-4">
              <NetworkStatus />
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between py-4 border-t border-b border-border">
            <div className="flex items-center gap-3">
              <div className="text-sm">
                <span className="text-muted-foreground">Total contacts:</span>
                <span className="ml-2 font-semibold text-foreground">
                  {filteredContacts.length}
                </span>
                {(searchQuery || showStarredOnly) && (
                  <span className="text-muted-foreground text-xs ml-1">
                    (of {contacts.length})
                  </span>
                )}
              </div>
              <Button
                variant={showStarredOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowStarredOnly(!showStarredOnly)}
                className="h-8"
              >
                <Star className={`h-3 w-3 mr-1 ${showStarredOnly ? 'fill-current' : ''}`} />
                Starred
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <AddContactForm />
              <SyncButton
                onSync={syncData}
                lastSync={lastSync}
                isOnline={isOnline}
              />
            </div>
          </div>
        </header>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name, company, city, status, or follow-up date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
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
