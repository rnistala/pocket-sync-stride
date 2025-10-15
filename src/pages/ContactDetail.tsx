import { useParams, useNavigate } from "react-router-dom";
import { useLeadContext } from "@/contexts/LeadContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, Mail, RefreshCw, Cloud } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const ContactDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { contacts, getContactInteractions } = useLeadContext();
  const [isSyncing, setIsSyncing] = useState(false);
  
  const contact = contacts.find((c) => c.id === id);
  const interactions = contact ? getContactInteractions(contact.id) : [];

  const handleSyncInteractions = async () => {
    if (!contact) return;
    
    const userId = localStorage.getItem("userId");
    if (!userId) {
      toast.error("User ID not found");
      return;
    }

    setIsSyncing(true);
    try {
      const response = await fetch(
        `https://demo.opterix.in/api/public/formwidgetdatahardcode/${userId}/token`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: 4,
            offset: 0,
            limit: 25,
            extra: [{
              operator: "in",
              value: contact.id,
              tablename: "contact",
              columnname: "id",
              function: "",
              datatype: "Selection",
              enable: "true",
              show: contact.name,
              extracolumn: "name"
            }]
          }),
        }
      );

      if (response.ok) {
        toast.success("Interaction history synced successfully!");
      } else {
        toast.error("Failed to sync interaction history");
      }
    } catch (error) {
      toast.error("Error syncing interactions");
      console.error("Sync error:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!contact) {
    return <div className="p-4">Contact not found</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          
          <Button
            onClick={handleSyncInteractions}
            disabled={isSyncing}
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing..." : "Sync Interactions"}
          </Button>
        </div>

        <Card className="p-6">
          <h1 className="text-2xl font-bold mb-4">{contact.name}</h1>
          
          <div className="space-y-3">
            <div>
              <span className="text-muted-foreground">Company: </span>
              <span>{contact.company}</span>
            </div>
            <div>
              <span className="text-muted-foreground">City: </span>
              <span>{contact.city}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Status: </span>
              <span>{contact.status}</span>
            </div>
            
            {contact.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${contact.phone}`} className="text-primary hover:underline">
                  {contact.phone}
                </a>
              </div>
            )}
            
            {contact.email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                  {contact.email}
                </a>
              </div>
            )}
          </div>
        </Card>

        {interactions.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Interaction History</h2>
            <div className="space-y-4">
              {interactions.map((interaction) => (
                <div key={interaction.id} className="border-b pb-4 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{interaction.type}</Badge>
                      {interaction.dirty && (
                        <div className="relative" title="Not synced yet">
                          <Cloud className="h-3 w-3 text-amber-500" />
                        </div>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(interaction.date).toLocaleDateString()} at{" "}
                      {new Date(interaction.date).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm">{interaction.notes}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ContactDetail;
