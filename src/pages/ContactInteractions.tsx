import { useParams, useNavigate } from "react-router-dom";
import { useLeadContext } from "@/contexts/LeadContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, Mail, MessageSquare, Plus, RefreshCw, CalendarIcon, Cloud } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ContactInteractions = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { contacts } = useLeadContext();
  
  // Find contact by either id or contact_id (for backward compatibility)
  const contact = contacts.find((c) => c.id === id || c.contact_id === id);

  // Early return BEFORE any conditional hooks
  if (!contact) {
    return <div className="p-4">Contact not found</div>;
  }

  return <ContactInteractionsContent contact={contact} navigate={navigate} />;
};

const ContactInteractionsContent = ({ contact, navigate }: { contact: any; navigate: any }) => {
  const { getContactInteractions, addInteraction, markInteractionsAsSynced, mergeInteractionsFromAPI } = useLeadContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [interactionType, setInteractionType] = useState<"call" | "whatsapp" | "email" | "meeting">("call");
  const [notes, setNotes] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState<Date>();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const interactions = getContactInteractions(contact.id);

  // Fetch interaction history on first load if not already cached
  useEffect(() => {
    const fetchInteractionHistory = async () => {
      if (interactions.length > 0 || isLoadingHistory) return;
      
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
          const apiResponse = await response.json();
          const apiInteractions = apiResponse.data?.[0]?.body || [];
          await mergeInteractionsFromAPI(apiInteractions, contact.id);
          console.log("Interaction history fetched and saved for contact", contact.id);
        }
      } catch (error) {
        console.error("Error fetching interaction history:", error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchInteractionHistory();
  }, [contact.id, interactions.length, isLoadingHistory, mergeInteractionsFromAPI]);

  const handleAddInteraction = () => {
    if (!notes.trim()) {
      toast.error("Please add notes");
      return;
    }
    
    addInteraction(
      contact.id, 
      interactionType, 
      notes, 
      undefined, 
      nextFollowUpDate?.toISOString()
    );
    setNotes("");
    setNextFollowUpDate(undefined);
    setIsDialogOpen(false);
    toast.success("Interaction logged");
  };

  const handleCall = () => {
    if (contact.phone) window.location.href = `tel:${contact.phone}`;
  };

  const handleWhatsApp = () => {
    if (contact.phone) window.open(`https://wa.me/${contact.phone.replace(/\D/g, "")}`, "_blank");
  };

  const handleEmail = () => {
    if (contact.email) window.location.href = `mailto:${contact.email}`;
  };

  const handleSyncInteractions = async () => {
    if (!contact) return;
    
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
            ordercolumn: "",
            ordertype: "",
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
        <Button variant="ghost" onClick={() => navigate('/')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>

        <Card className="p-6">
          <h1 className="text-2xl font-bold mb-2">{contact.name}</h1>
          <p className="text-muted-foreground mb-4">{contact.company} • {contact.city}</p>
          
          <div className="flex gap-2">
            <Button onClick={handleCall} variant="outline" className="gap-2">
              <Phone className="h-4 w-4" />
              Call
            </Button>
            <Button onClick={handleWhatsApp} variant="outline" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              WhatsApp
            </Button>
            <Button onClick={handleEmail} variant="outline" className="gap-2">
              <Mail className="h-4 w-4" />
              Email
            </Button>
          </div>
        </Card>

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Interaction History</h2>
          <div className="flex gap-2">
            <Button
              onClick={handleSyncInteractions}
              disabled={isSyncing}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing..." : "Sync"}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Log Interaction
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log New Interaction</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Type</Label>
                  <Select value={interactionType} onValueChange={(v: any) => setInteractionType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="What was discussed?"
                    rows={4}
                  />
                </div>
                <div>
                  <Label>Next Follow-Up Date</Label>
                  <div className="relative">
                    <Input
                      type="date"
                      value={nextFollowUpDate ? format(nextFollowUpDate, "yyyy-MM-dd") : ""}
                      onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value) : undefined;
                        setNextFollowUpDate(date);
                      }}
                      min={format(new Date(), "yyyy-MM-dd")}
                      className="w-full pr-10"
                    />
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full"
                        >
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar
                          mode="single"
                          selected={nextFollowUpDate}
                          onSelect={setNextFollowUpDate}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <Button onClick={handleAddInteraction} className="w-full">
                  Save Interaction
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <div className="space-y-4">
          {interactions.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground">
              No interactions logged yet
            </Card>
          ) : (
            interactions.map((interaction) => (
              <Card key={interaction.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {interaction.type}
                    </Badge>
                    {interaction.dirty && (
                      <div className="relative" title="Not synced yet">
                        <Cloud className="h-3 w-3 text-amber-500" />
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(interaction.date).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })} at {new Date(interaction.date).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                <p className="text-sm">{interaction.notes}</p>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactInteractions;
