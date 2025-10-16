import { useParams, useNavigate } from "react-router-dom";
import { useLeadContext } from "@/contexts/LeadContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, Mail, RefreshCw, Cloud, CalendarIcon, Pencil } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ContactDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { contacts, getContactInteractions, markInteractionsAsSynced, mergeInteractionsFromAPI } = useLeadContext();
  
  const contact = contacts.find((c) => c.id === id);

  // Early return BEFORE any conditional hooks
  if (!contact) {
    return <div className="p-4">Contact not found</div>;
  }

  return <ContactDetailContent contact={contact} navigate={navigate} />;
};

const ContactDetailContent = ({ contact, navigate }: { contact: any; navigate: any }) => {
  const { getContactInteractions, markInteractionsAsSynced, mergeInteractionsFromAPI, syncData } = useLeadContext();
  const [isSyncing, setIsSyncing] = useState(false);
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>(
    contact.followup_on ? new Date(contact.followup_on) : undefined
  );
  const [isFollowUpCalendarOpen, setIsFollowUpCalendarOpen] = useState(false);
  const [isUpdatingFollowUp, setIsUpdatingFollowUp] = useState(false);
  
  const interactions = getContactInteractions(contact.id);

  // Auto-sync when network becomes available
  useEffect(() => {
    const syncInteractionsOnline = async () => {
      if (!navigator.onLine) return;
      
      const userId = localStorage.getItem("userId");
      if (!userId) return;

      setIsSyncing(true);
      try {
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

          await markInteractionsAsSynced(contact.id);
        }

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
          const apiResponse = await response.json();
          const apiInteractions = apiResponse.data?.[0]?.body || [];
          await mergeInteractionsFromAPI(apiInteractions, contact.id);
        }
      } catch (error) {
        console.error("Auto-sync error:", error);
      } finally {
        setIsSyncing(false);
      }
    };

    const handleOnline = () => {
      syncInteractionsOnline();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [contact.id, markInteractionsAsSynced, mergeInteractionsFromAPI]);

  // Auto-sync interactions
  useEffect(() => {
    const syncInteractions = async () => {
      if (!navigator.onLine) return;
      
      const userId = localStorage.getItem("userId");
      if (!userId) return;

      setIsSyncing(true);
      try {
        // Upload dirty interactions
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

          await markInteractionsAsSynced(contact.id);
        }

        // Fetch interaction history
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
          const apiResponse = await response.json();
          const apiInteractions = apiResponse.data?.[0]?.body || [];
          await mergeInteractionsFromAPI(apiInteractions, contact.id);
        }
      } catch (error) {
        console.error("Auto-sync error:", error);
      } finally {
        setIsSyncing(false);
      }
    };

    // Initial sync
    syncInteractions();

    // Auto-sync every 3 minutes
    const syncInterval = setInterval(syncInteractions, 3 * 60 * 1000);

    return () => clearInterval(syncInterval);
  }, [contact.id, markInteractionsAsSynced, mergeInteractionsFromAPI]);

  const handleFollowUpDateChange = async (date: Date | undefined) => {
    if (!date) return;
    
    setFollowUpDate(date);
    setIsFollowUpCalendarOpen(false);
    setIsUpdatingFollowUp(true);

    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        toast.error("User ID not found. Please log in again.");
        return;
      }

      const payload = {
        meta: {
          btable: "contact",
          htable: "",
          parentkey: "",
          preapi: "",
          draftid: "",
        },
        data: [
          {
            body: [
              {
                id: contact.id,
                followup_on: format(date, "yyyy-MM-dd"),
              },
            ],
            dirty: "true",
          },
        ],
      };

      const response = await fetch(`https://demo.opterix.in/api/public/tdata/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success("Follow-up date updated");
        await syncData();
      } else {
        toast.error("Failed to update follow-up date");
      }
    } catch (error) {
      console.error("Error updating follow-up date:", error);
      toast.error("Failed to update follow-up date");
    } finally {
      setIsUpdatingFollowUp(false);
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
          
          {isSyncing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Auto-syncing...
            </div>
          )}
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

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Follow-Up Date: </span>
              <Popover open={isFollowUpCalendarOpen} onOpenChange={setIsFollowUpCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "justify-start text-left font-normal",
                      !followUpDate && "text-muted-foreground"
                    )}
                    disabled={isUpdatingFollowUp}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {followUpDate ? format(followUpDate, "PPP") : <span>Pick a date</span>}
                    <Pencil className="ml-2 h-3 w-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={followUpDate}
                    onSelect={handleFollowUpDateChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
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
