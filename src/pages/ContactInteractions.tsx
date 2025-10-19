import { useParams, useNavigate } from "react-router-dom";
import { useLeadContext } from "@/contexts/LeadContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, Mail, MessageSquare, Plus, RefreshCw, CalendarIcon, Cloud, Pencil, Star, ArrowDown } from "lucide-react";
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
import { format, addYears } from "date-fns";
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

  return <ContactInteractionsContent contactId={contact.id} navigate={navigate} />;
};

const ContactInteractionsContent = ({ contactId, navigate }: { contactId: string; navigate: any }) => {
  const { contacts, getContactInteractions, addInteraction, markInteractionsAsSynced, mergeInteractionsFromAPI, syncData, toggleStarred, updateContactFollowUp } = useLeadContext();
  
  // Get fresh contact from context every render
  const contact = contacts.find((c) => c.id === contactId);
  
  if (!contact) {
    return <div className="p-4">Contact not found</div>;
  }
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [interactionType, setInteractionType] = useState<"call" | "whatsapp" | "email" | "meeting">("call");
  const [notes, setNotes] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState<Date>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>(
    contact.followup_on ? new Date(contact.followup_on) : undefined
  );
  const [isFollowUpCalendarOpen, setIsFollowUpCalendarOpen] = useState(false);
  const [isUpdatingFollowUp, setIsUpdatingFollowUp] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [editFormData, setEditFormData] = useState({
    name: contact.name || "",
    company: contact.company || "",
    city: contact.city || "",
    mobile: contact.phone || "",
    email: contact.email || "",
    profile: contact.profile || "",
    status: contact.status || "Fresh",
    contact_person: "",
    address: "",
    remarks: "",
    industry: "",
  });

  const interactions = getContactInteractions(contact.id);

  // useEffect hooks
  useEffect(() => {
    const autoSync = async () => {
      if (!navigator.onLine || isSyncing) return;
      
      const dirtyInteractions = interactions.filter(i => i.dirty);
      if (dirtyInteractions.length === 0) return;

      console.log("[AUTO-SYNC] Found", dirtyInteractions.length, "dirty interactions");
      await handleSyncInteractions();
    };

    // Check for dirty interactions periodically
    const syncInterval = setInterval(autoSync, 2000);
    
    // Also check immediately when interactions change
    autoSync();

    return () => clearInterval(syncInterval);
  }, [interactions, isSyncing]);

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

  // handler functions
  const handleAddInteraction = async () => {
    if (!notes.trim()) {
      toast.error("Please add notes");
      return;
    }
    
    if (!nextFollowUpDate) {
      toast.error("Please select a follow-up date");
      return;
    }
    
    await addInteraction(
      contact.id, 
      interactionType, 
      notes, 
      undefined, 
      nextFollowUpDate.toISOString()
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

  const handleEditContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

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
                name: editFormData.name,
                company: editFormData.company,
                city: editFormData.city,
                mobile: editFormData.mobile,
                email: editFormData.email,
                profile: editFormData.profile,
                status: editFormData.status,
                contact_person: editFormData.contact_person,
                address: editFormData.address,
                remarks: editFormData.remarks,
                industry: editFormData.industry,
              },
            ],
            dirty: "true",
          },
        ],
      };

      const response = await fetch(
        `https://demo.opterix.in/api/public/tdata/${userId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update contact");
      }

      toast.success("Contact updated successfully");
      setIsEditDialogOpen(false);
      await syncData();
    } catch (error) {
      console.error("Error updating contact:", error);
      toast.error("Failed to update contact. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
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
      const currentInteractions = getContactInteractions(contact.id);
      const dirtyInteractions = currentInteractions.filter(i => i.dirty);
      
      console.log("[SYNC] Current interactions:", currentInteractions.length);
      console.log("[SYNC] Dirty interactions:", dirtyInteractions.length);
      
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
                next_meeting: interaction.followup_on || "",
                latitude: latitude,
                longitude: longitude
              }],
              dirty: "true"
            }]
          };

          console.log("[SYNC] Uploading interaction:", interaction.notes);

          await fetch(`https://demo.opterix.in/api/public/tdata/${userId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        }

        await markInteractionsAsSynced(contact.id);
        toast.success("Interactions synced successfully!");
      } else {
        console.log("[SYNC] No dirty interactions to sync");
      }

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

      if (!response.ok) {
        toast.error("Failed to fetch interaction history");
      }
    } catch (error) {
      toast.error("Error syncing interactions");
      console.error("Sync error:", error);
    } finally {
      setIsSyncing(false);
    }
  };

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
        await updateContactFollowUp(contact.id, date.toISOString());
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

  const handlePushDown = async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      toast.error("User ID not found");
      return;
    }

    try {
      const futureDate = addYears(new Date(), 100);
      await updateContactFollowUp(contact.id, futureDate.toISOString());
      setFollowUpDate(futureDate);
      
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
                followup_on: format(futureDate, "yyyy-MM-dd"),
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
        toast.success("Contact pushed down");
      } else {
        toast.error("Failed to update contact");
      }
    } catch (error) {
      console.error("Error pushing contact down:", error);
      toast.error("Failed to update contact");
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdatingStatus(true);

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
                status: newStatus,
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
        toast.success("Status updated successfully");
        await syncData();
      } else {
        toast.error("Failed to update status");
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-3 overflow-x-hidden">
      <div className="max-w-3xl mx-auto space-y-3 w-full">
        <Button variant="ghost" onClick={() => navigate('/')} size="sm" className="gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Button>

        <Card className="p-4 shadow-lg border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex-1">
              <div className="flex items-start gap-3 mb-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-primary">
                    {contact.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <h1 className="text-xl font-bold mb-1">{contact.name}</h1>
                  <p className="text-sm text-muted-foreground">{contact.company} • {contact.city}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select
                    value={contact.status || "New"}
                    onValueChange={handleStatusChange}
                    disabled={isUpdatingStatus}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New">New</SelectItem>
                      <SelectItem value="Contacted">Contacted</SelectItem>
                      <SelectItem value="Qualified">Qualified</SelectItem>
                      <SelectItem value="Demo Scheduled">Demo Scheduled</SelectItem>
                      <SelectItem value="Closed Won">Closed Won</SelectItem>
                      <SelectItem value="Closed Lost">Closed Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Follow-Up Date</Label>
                  <Popover open={isFollowUpCalendarOpen} onOpenChange={setIsFollowUpCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full h-9 justify-start text-left font-normal text-sm",
                          !followUpDate && "text-muted-foreground"
                        )}
                        disabled={isUpdatingFollowUp}
                      >
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {followUpDate ? format(followUpDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={followUpDate}
                        onSelect={handleFollowUpDateChange}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Button 
                  onClick={handleCall} 
                  variant="outline" 
                  size="sm" 
                  className="h-10 border-primary/30 hover:bg-primary/10" 
                  disabled={!contact.phone}
                >
                  <Phone className="h-4 w-4 mr-1.5" />
                  Call
                </Button>
                <Button 
                  onClick={handleWhatsApp} 
                  variant="outline" 
                  size="sm" 
                  className="h-10 border-primary/30 hover:bg-primary/10" 
                  disabled={!contact.phone}
                >
                  <MessageSquare className="h-4 w-4 mr-1.5" />
                  WhatsApp
                </Button>
                <Button 
                  onClick={handleEmail} 
                  variant="outline" 
                  size="sm" 
                  className="h-10 border-primary/30 hover:bg-primary/10" 
                  disabled={!contact.email}
                >
                  <Mail className="h-4 w-4 mr-1.5" />
                  Email
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => toggleStarred(contact.id)}
              >
                <Star 
                  className={`h-4 w-4 ${contact.starred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={handlePushDown}
              >
                <ArrowDown className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Edit Contact</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleEditContact} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name *</Label>
                        <Input
                          id="name"
                          required
                          value={editFormData.name}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, name: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company">Company *</Label>
                        <Input
                          id="company"
                          required
                          value={editFormData.company}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, company: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City *</Label>
                        <Input
                          id="city"
                          required
                          value={editFormData.city}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, city: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mobile">Mobile *</Label>
                        <Input
                          id="mobile"
                          type="tel"
                          required
                          value={editFormData.mobile}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, mobile: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        placeholder="email@example.com, another@example.com"
                        value={editFormData.email}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, email: e.target.value })
                        }
                      />
                      <p className="text-xs text-muted-foreground">Separate multiple emails with commas</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="profile">Profile</Label>
                        <Input
                          id="profile"
                          value={editFormData.profile}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, profile: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="status">Status *</Label>
                        <Select
                          value={editFormData.status}
                          onValueChange={(value) =>
                            setEditFormData({ ...editFormData, status: value })
                          }
                        >
                          <SelectTrigger id="status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="New">New</SelectItem>
                            <SelectItem value="Contacted">Contacted</SelectItem>
                            <SelectItem value="Qualified">Qualified</SelectItem>
                            <SelectItem value="Demo Scheduled">Demo Scheduled</SelectItem>
                            <SelectItem value="Closed Won">Closed Won</SelectItem>
                            <SelectItem value="Closed Lost">Closed Lost</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="contact_person">Contact Person</Label>
                        <Input
                          id="contact_person"
                          value={editFormData.contact_person}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, contact_person: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="industry">Industry</Label>
                        <Input
                          id="industry"
                          value={editFormData.industry}
                          onChange={(e) =>
                            setEditFormData({ ...editFormData, industry: e.target.value })
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Textarea
                        id="address"
                        value={editFormData.address}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, address: e.target.value })
                        }
                        rows={2}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="remarks">Remarks</Label>
                      <Textarea
                        id="remarks"
                        value={editFormData.remarks}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, remarks: e.target.value })
                        }
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsEditDialogOpen(false)}
                        disabled={isSubmitting}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold">Interaction History</h2>
          <div className="flex gap-1.5">
            <Button 
              onClick={handleSyncInteractions}
              variant="outline" 
              size="sm"
              disabled={isSyncing}
              className="h-8"
            >
              {isSyncing ? (
                <>
                  <Cloud className="h-3 w-3 mr-1 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Sync
                </>
              )}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8">
                  <Plus className="h-3 w-3 mr-1" />
                  Log
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-lg">Log Interaction</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
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
                    <Label className="text-sm">Notes</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="What was discussed?"
                      rows={3}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Next Follow-Up Date *</Label>
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full h-9 justify-start text-left font-normal text-sm",
                            !nextFollowUpDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="h-4 w-4 mr-2" />
                          {nextFollowUpDate ? format(nextFollowUpDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={nextFollowUpDate}
                          onSelect={(date) => {
                            setNextFollowUpDate(date);
                            setIsCalendarOpen(false);
                          }}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Button onClick={handleAddInteraction} className="w-full">
                    Save Interaction
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="space-y-2">
          {interactions.length === 0 ? (
            <Card className="p-4 text-center text-sm text-muted-foreground">
              No interactions logged yet
            </Card>
          ) : (
            interactions.map((interaction) => (
              <Card key={interaction.id} className="p-3">
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="capitalize text-xs py-0">
                      {interaction.type}
                    </Badge>
                    {interaction.dirty && (
                      <div className="relative" title="Not synced yet">
                        <Cloud className="h-3 w-3 text-amber-500" />
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(interaction.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric' 
                    })} {new Date(interaction.date).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                <p className="text-sm leading-relaxed">{interaction.notes}</p>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactInteractions;
