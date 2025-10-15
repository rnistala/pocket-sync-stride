import { NetworkStatus } from "@/components/NetworkStatus";
import { SyncButton } from "@/components/SyncButton";
import { ContactList } from "@/components/ContactList";
import { useLeadContext } from "@/contexts/LeadContext";
import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { LogOut, Search } from "lucide-react";

const Index = () => {
  const { contacts, syncData, lastSync, isLoading, searchQuery, setSearchQuery } = useLeadContext();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const navigate = useNavigate();

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    
    const query = searchQuery.toLowerCase();
    return contacts.filter(contact => {
      const followUpDate = new Date(contact.nextFollowUp).toLocaleDateString().toLowerCase();
      return (
        contact.name.toLowerCase().includes(query) ||
        contact.company.toLowerCase().includes(query) ||
        contact.city.toLowerCase().includes(query) ||
        followUpDate.includes(query)
      );
    });
  }, [contacts, searchQuery]);

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
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                Lead Manager
              </h1>
              <p className="text-muted-foreground mt-2">
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
            <div className="text-sm">
              <span className="text-muted-foreground">Total contacts:</span>
              <span className="ml-2 font-semibold text-foreground">
                {filteredContacts.length}
              </span>
              {searchQuery && (
                <span className="text-muted-foreground text-xs ml-1">
                  (of {contacts.length})
                </span>
              )}
            </div>
            <SyncButton
              onSync={syncData}
              lastSync={lastSync}
              isOnline={isOnline}
            />
          </div>
        </header>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name, company, city, or follow-up date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading contacts...
          </div>
        ) : (
          <ContactList contacts={filteredContacts} />
        )}
      </div>
    </div>
  );
};

export default Index;
