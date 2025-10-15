import { useParams, useNavigate } from "react-router-dom";
import { useLeadContext } from "@/contexts/LeadContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, Mail, RefreshCw, Cloud } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const ContactDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { contacts, getContactInteractions, markInteractionsAsSynced } = useLeadContext();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  
  const contact = contacts.find((c) => c.id === id);
  const interactions = contact ? getContactInteractions(contact.id) : [];

  // Fetch interaction history on first load if not already cached
  useEffect(() => {
    const fetchInteractionHistory = async () => {
      if (!contact || interactions.length > 0 || isLoadingHistory) return;
      
      const userId = localStorage.getItem("userId");
      if (!userId) return;

      setIsLoadingHistory(true);
      try {
        const response = await fetch(
          `https://demo.opterix.in/api/public/formwidgetdatahardcode/${userId}/token`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: 4,
              offset: 0,
              limit: 100,
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
          console.log("Interaction history fetched for contact", contact.id);
        }
      } catch (error) {
        console.error("Error fetching interaction history:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchInteractionHistory();
  }, [contact?.id]);

  if (!contact) {
    return <div className="p-4">Contact not found</div>;
  }

  const handleSyncInteractions = async () => {
    
    const userId = localStorage.getItem("userId");
    if (!userId) {
      toast.error("User ID not found");
      return;
    }

    setIsSyncing(true);
    try {
      // Step 1: Upload dirty interactions for this contact only
      const dirtyInteractions = interactions.filter(i => i.dirty);
      
      if (dirtyInteractions.length > 0) {
        let latitude = "";
        let longitude = "";
        
        if (navigator.geolocation) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
            });
            latitude = position.coords.latitude.toString();
            longitude = position.coords.longitude.toString();
          } catch (error) {
            console.log("Geolocation not available", error);
          }
        }

        for (const interaction of dirtyInteractions) {
          const payload = {
            meta: {
              btable: "followup",
              htable: "",
              parentkey: "",
              preapi: "updatecontact",
              draftid: ""
            },
            data: [{
              body: [{
                contact: contact.id,
                contact_status: "",
                notes: interaction.notes,
                next_meeting: interaction.nextFollowUp || "",
                latitude: latitude,
                longitude: longitude
              }],
              dirty: "true"
            }]
          };

          await fetch(`https://demo.opterix.in/api/public/tdata/${userId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }

        // Mark interactions as synced
        await markInteractionsAsSynced(contact.id);
      }

      // Step 2: Fetch interaction history for this contact
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
        toast.success("Interactions synced successfully!");
      } else {
        toast.error("Failed to sync interactions");
      }
    } catch (error) {
      toast.error("Error syncing interactions");
      console.error("Sync error:", error);
    } finally {
      setIsSyncing(false);
    }
  };

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
