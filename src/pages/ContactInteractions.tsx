import { useParams, useNavigate } from "react-router-dom";
import { useLeadContext } from "@/contexts/LeadContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, Mail, Plus, RefreshCw, CalendarIcon, Cloud, Pencil, Star, ArrowDown, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect, useRef } from "react";
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
  const { contacts, getContactInteractions, addInteraction, markInteractionsAsSynced, mergeInteractionsFromAPI, syncData, toggleStarred, updateContactFollowUp, fetchOrders } = useLeadContext();
  
  // Get fresh contact from context every render
  const contact = contacts.find((c) => c.id === contactId);
  
  if (!contact) {
    return <div className="p-4">Contact not found</div>;
  }
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [interactionType, setInteractionType] = useState<"call" | "whatsapp" | "email" | "meeting">("call");
  const [notes, setNotes] = useState("");
  const [nextFollowUpDate, setNextFollowUpDate] = useState<Date>();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [orderFormData, setOrderFormData] = useState({
    orderNumber: "",
    orderDate: new Date(),
    orderValue: "",
    orderNotes: "",
  });
  const [isOrderCalendarOpen, setIsOrderCalendarOpen] = useState(false);
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>(
    contact.followup_on ? new Date(contact.followup_on) : undefined
  );
  const [isFollowUpCalendarOpen, setIsFollowUpCalendarOpen] = useState(false);
  const [isUpdatingFollowUp, setIsUpdatingFollowUp] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [followUpDateText, setFollowUpDateText] = useState(
    contact.followup_on ? format(new Date(contact.followup_on), "dd-MM-yyyy") : ""
  );
  const [nextFollowUpDateText, setNextFollowUpDateText] = useState("");
  const [isResearchDialogOpen, setIsResearchDialogOpen] = useState(false);
  const [isResearching, setIsResearching] = useState(false);
  const [researchData, setResearchData] = useState<any>(null);
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
  
  // Track which contacts have been fetched
  const fetchedContactsRef = useRef<Set<string>>(new Set());

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

  // Fetch interactions only once when contact is first loaded
  useEffect(() => {
    const fetchInteractionHistory = async () => {
      // Skip if already fetched for this contact
      if (fetchedContactsRef.current.has(contact.id)) return;
      
      // Skip if already have interactions or currently loading
      if (interactions.length > 0 || isLoadingHistory) return;
      
      const userId = localStorage.getItem("userId");
      if (!userId) return;

      // Mark as fetched before starting to prevent duplicate calls
      fetchedContactsRef.current.add(contact.id);
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
        // Remove from fetched set on error so it can be retried
        fetchedContactsRef.current.delete(contact.id);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchInteractionHistory();
  }, [contact.id]); // Only depend on contact.id

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
    if (contact.phone) {
      let phoneNumber = contact.phone;
      
      // If there's a comma, take only the part before it
      if (phoneNumber.includes(',')) {
        phoneNumber = phoneNumber.split(',')[0].trim();
      }
      
      // Remove all non-digit characters
      const cleanNumber = phoneNumber.replace(/\D/g, "");
      
      // If the original doesn't start with +, add +91
      const finalNumber = phoneNumber.trim().startsWith('+') ? cleanNumber : '91' + cleanNumber;
      
      window.open(`https://wa.me/${finalNumber}`, "_blank");
    }
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

  const handleSubmitOrder = async () => {
    if (!orderFormData.orderNumber.trim()) {
      toast.error("Please enter order number");
      return;
    }
    
    if (!orderFormData.orderValue.trim()) {
      toast.error("Please enter order value");
      return;
    }
    
    setIsSubmittingOrder(true);

    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        toast.error("User ID not found. Please log in again.");
        return;
      }

      const payload = {
        meta: {
          btable: "so",
          htable: "",
          parentkey: "",
          preapi: "",
          draftid: "",
        },
        data: [
          {
            body: [
              {
                buyer: contact.id,
                sodate: format(orderFormData.orderDate, "yyyy-MM-dd"),
                total_basic: orderFormData.orderValue,
                po_no: orderFormData.orderNumber,
                comment: orderFormData.orderNotes,
                createdby: userId,
                created: format(new Date(), "yyyy-MM-dd"),
              },
            ],
            dirty: "true",
          },
        ],
      };

      console.log("[ORDER SUBMIT] Sending request to:", `https://demo.opterix.in/api/public/tdata/${userId}`);
      console.log("[ORDER SUBMIT] Payload:", JSON.stringify(payload, null, 2));
      
      const response = await fetch(`https://demo.opterix.in/api/public/tdata/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log("[ORDER SUBMIT] Response status:", response.status);
      console.log("[ORDER SUBMIT] Response ok:", response.ok);

      if (response.ok) {
        const responseData = await response.text();
        console.log("[ORDER SUBMIT] Response data:", responseData);
        
        toast.success("Order submitted successfully");
        setIsOrderDialogOpen(false);
        setOrderFormData({
          orderNumber: "",
          orderDate: new Date(),
          orderValue: "",
          orderNotes: "",
        });
        // Refresh orders from API and update IndexedDB
        console.log("[ORDER SUBMIT] Fetching updated orders...");
        await fetchOrders();
      } else {
        const errorText = await response.text();
        console.error("[ORDER SUBMIT] Failed with status:", response.status);
        console.error("[ORDER SUBMIT] Error response:", errorText);
        toast.error(`Failed to submit order (Status: ${response.status})`);
      }
    } catch (error) {
      console.error("Error submitting order:", error);
      toast.error("Failed to submit order");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleResearchCompany = async () => {
    if (!contact.company) {
      toast.error("No company name available");
      return;
    }

    setIsResearching(true);
    setResearchData(null);
    setIsResearchDialogOpen(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/research-company`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ 
            companyName: contact.company,
            city: contact.city 
          }),
        }
      );

      if (response.status === 429) {
        toast.error("Rate limit exceeded. Please try again later.");
        setIsResearchDialogOpen(false);
        return;
      }

      if (response.status === 402) {
        toast.error("AI credits depleted. Please add credits to your workspace.");
        setIsResearchDialogOpen(false);
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to research company");
      }

      const data = await response.json();
      setResearchData(data.research);
    } catch (error) {
      console.error("Error researching company:", error);
      toast.error("Failed to research company");
      setIsResearchDialogOpen(false);
    } finally {
      setIsResearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-3 overflow-x-hidden">
      <div className="max-w-3xl mx-auto space-y-3 w-full">
        <Button variant="ghost" onClick={() => navigate('/')} size="sm" className="gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Button>

        <Card className="p-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold mb-0.5">{contact.name}</h1>
              <p className="text-xs text-muted-foreground mb-2">{contact.company} • {contact.city}</p>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => toggleStarred(contact.id)}
              >
                <Star 
                  className={`h-3.5 w-3.5 ${contact.starred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
                />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handlePushDown}
              >
                <ArrowDown className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
              <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Pencil className="h-3 w-3" />
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
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="New">New</SelectItem>
                            <SelectItem value="Contacted">Contacted</SelectItem>
                            <SelectItem value="Qualified">Qualified</SelectItem>
                            <SelectItem value="Demo Done">Demo Done</SelectItem>
                            <SelectItem value="Regular">Regular</SelectItem>
                            <SelectItem value="Drop">Drop</SelectItem>
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
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground shrink-0">Status:</span>
              <Select
                value={contact.status || "New"}
                onValueChange={handleStatusChange}
                disabled={isUpdatingStatus}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder={contact.status || "Select status"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Contacted">Contacted</SelectItem>
                  <SelectItem value="Qualified">Qualified</SelectItem>
                  <SelectItem value="Demo Done">Demo Done</SelectItem>
                  <SelectItem value="Regular">Regular</SelectItem>
                  <SelectItem value="Drop">Drop</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground shrink-0">Follow-Up:</span>
              <Popover open={isFollowUpCalendarOpen} onOpenChange={setIsFollowUpCalendarOpen}>
                <div className="relative flex-1">
                  <Input
                    placeholder="ddmmyyyy"
                    value={followUpDateText}
                    onChange={(e) => {
                      let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                      
                      // Auto-format with dashes
                      if (value.length >= 2) {
                        value = value.slice(0, 2) + '-' + value.slice(2);
                      }
                      if (value.length >= 5) {
                        value = value.slice(0, 5) + '-' + value.slice(5);
                      }
                      value = value.slice(0, 10); // Limit to dd-mm-yyyy
                      
                      setFollowUpDateText(value);
                      
                      // Parse dd-MM-yyyy format
                      const parts = value.split('-');
                      if (parts.length === 3 && parts[2].length === 4) {
                        const [day, month, year] = parts;
                        const parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                        if (!isNaN(parsed.getTime())) {
                          setFollowUpDate(parsed);
                        }
                      }
                    }}
                    onBlur={() => {
                      // Parse and update on blur
                      const parts = followUpDateText.split('-');
                      if (parts.length === 3 && parts[2].length === 4) {
                        const [day, month, year] = parts;
                        const parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                        if (!isNaN(parsed.getTime())) {
                          handleFollowUpDateChange(parsed);
                        }
                      }
                    }}
                    disabled={isUpdatingFollowUp}
                    className="h-7 text-xs pr-8"
                  />
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 absolute right-1 top-1/2 -translate-y-1/2"
                      disabled={isUpdatingFollowUp}
                    >
                      <CalendarIcon className="h-3 w-3" />
                    </Button>
                  </PopoverTrigger>
                </div>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={followUpDate}
                    onSelect={(date) => {
                      if (date) {
                        setFollowUpDateText(format(date, "dd-MM-yyyy"));
                        handleFollowUpDateChange(date);
                      }
                      setIsFollowUpCalendarOpen(false);
                    }}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          <div className="grid grid-cols-4 gap-1.5 mt-2">
            <Button onClick={handleCall} variant="outline" size="icon" className="h-9 w-full" disabled={!contact.phone}>
              <Phone className="h-4 w-4" />
            </Button>
            <Button onClick={handleWhatsApp} variant="outline" size="icon" className="h-9 w-full" disabled={!contact.phone}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
            </Button>
            <Button onClick={handleEmail} variant="outline" size="icon" className="h-9 w-full" disabled={!contact.email}>
              <Mail className="h-4 w-4" />
            </Button>
            <Button onClick={handleResearchCompany} variant="outline" size="icon" className="h-9 w-full" disabled={!contact.company}>
              <Info className="h-4 w-4" />
            </Button>
          </div>

          <Dialog open={isResearchDialogOpen} onOpenChange={setIsResearchDialogOpen}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Company Research: {contact.company}</DialogTitle>
              </DialogHeader>
              
              {isResearching ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center space-y-3">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Researching company information...</p>
                  </div>
                </div>
              ) : researchData ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Summary</h3>
                    <p className="text-sm text-muted-foreground">{researchData.summary}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold mb-2">Industry</h3>
                    <Badge variant="secondary">{researchData.industry}</Badge>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold mb-2">Products & Services</h3>
                    <p className="text-sm text-muted-foreground">{researchData.products}</p>
                  </div>

                  {researchData.owner && researchData.owner !== "Not available" && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Owner / Management</h3>
                      <p className="text-sm text-muted-foreground">{researchData.owner}</p>
                    </div>
                  )}

                  {researchData.address && researchData.address !== "Not available" && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Address</h3>
                      <p className="text-sm text-muted-foreground">{researchData.address}</p>
                    </div>
                  )}

                  {researchData.phone && researchData.phone !== "Not available" && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Phone</h3>
                      <p className="text-sm text-muted-foreground">{researchData.phone}</p>
                    </div>
                  )}

                  {researchData.email && researchData.email !== "Not available" && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Email</h3>
                      <p className="text-sm text-muted-foreground">{researchData.email}</p>
                    </div>
                  )}

                  {researchData.size && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Company Size</h3>
                      <p className="text-sm text-muted-foreground">{researchData.size}</p>
                    </div>
                  )}

                  {researchData.recentNews && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Recent News</h3>
                      <p className="text-sm text-muted-foreground">{researchData.recentNews}</p>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="flex justify-end pt-4">
                <Button onClick={() => setIsResearchDialogOpen(false)}>Close</Button>
              </div>
            </DialogContent>
          </Dialog>
        </Card>

        <div className="flex items-center justify-between mb-2">
          <h2 className="text-base font-semibold">Interaction History</h2>
          <div className="flex gap-2">
            <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8" variant="outline">
                  <Plus className="h-3 w-3 mr-1" />
                  Order
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-lg">Create Order</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm">Order Number *</Label>
                    <Input
                      value={orderFormData.orderNumber}
                      onChange={(e) =>
                        setOrderFormData({ ...orderFormData, orderNumber: e.target.value })
                      }
                      placeholder="Enter order number"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Order Date *</Label>
                    <Popover open={isOrderCalendarOpen} onOpenChange={setIsOrderCalendarOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal text-sm",
                            !orderFormData.orderDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-3 w-3" />
                          {orderFormData.orderDate ? (
                            format(orderFormData.orderDate, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={orderFormData.orderDate}
                          onSelect={(date) => {
                            if (date) {
                              setOrderFormData({ ...orderFormData, orderDate: date });
                            }
                            setIsOrderCalendarOpen(false);
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label className="text-sm">Order Value *</Label>
                    <Input
                      type="number"
                      value={orderFormData.orderValue}
                      onChange={(e) =>
                        setOrderFormData({ ...orderFormData, orderValue: e.target.value })
                      }
                      placeholder="Enter order value"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-sm">Order Notes</Label>
                    <Textarea
                      value={orderFormData.orderNotes}
                      onChange={(e) =>
                        setOrderFormData({ ...orderFormData, orderNotes: e.target.value })
                      }
                      placeholder="Additional notes (optional)"
                      rows={3}
                      className="text-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsOrderDialogOpen(false)}
                    disabled={isSubmittingOrder}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleSubmitOrder} disabled={isSubmittingOrder}>
                    {isSubmittingOrder ? "Submitting..." : "Submit Order"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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
                    <div className="relative">
                      <Input
                        placeholder="ddmmyyyy"
                        value={nextFollowUpDateText}
                        onChange={(e) => {
                          let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                          
                          // Auto-format with dashes
                          if (value.length >= 2) {
                            value = value.slice(0, 2) + '-' + value.slice(2);
                          }
                          if (value.length >= 5) {
                            value = value.slice(0, 5) + '-' + value.slice(5);
                          }
                          value = value.slice(0, 10); // Limit to dd-mm-yyyy
                          
                          setNextFollowUpDateText(value);
                          
                          // Parse dd-MM-yyyy format as user types
                          const parts = value.split('-');
                          if (parts.length === 3 && parts[2].length === 4) {
                            const [day, month, year] = parts;
                            const parsed = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                            if (!isNaN(parsed.getTime())) {
                              setNextFollowUpDate(parsed);
                            }
                          }
                        }}
                        className="h-9 text-sm pr-9"
                      />
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 absolute right-1.5 top-1/2 -translate-y-1/2"
                        >
                          <CalendarIcon className="h-3.5 w-3.5" />
                        </Button>
                      </PopoverTrigger>
                    </div>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={nextFollowUpDate}
                        onSelect={(date) => {
                          if (date) {
                            setNextFollowUpDateText(format(date, "dd-MM-yyyy"));
                            setNextFollowUpDate(date);
                          }
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
