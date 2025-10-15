import { useParams, useNavigate } from "react-router-dom";
import { useLeadContext } from "@/contexts/LeadContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, Mail, MessageSquare, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const ContactInteractions = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { contacts, getContactInteractions, addInteraction } = useLeadContext();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [interactionType, setInteractionType] = useState<"call" | "whatsapp" | "email" | "meeting">("call");
  const [notes, setNotes] = useState("");
  
  const contact = contacts.find((c) => c.id === id);
  const interactions = getContactInteractions(id || "");

  if (!contact) {
    return <div className="p-4">Contact not found</div>;
  }

  const handleAddInteraction = () => {
    if (!notes.trim()) {
      toast.error("Please add notes");
      return;
    }
    
    addInteraction(contact.id, interactionType, notes);
    setNotes("");
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

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
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
                <Button onClick={handleAddInteraction} className="w-full">
                  Save Interaction
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
                  <Badge variant="secondary" className="capitalize">
                    {interaction.type}
                  </Badge>
                  <div className="text-sm text-muted-foreground">
                    {new Date(interaction.date).toLocaleDateString()} • {new Date(interaction.date).toLocaleTimeString()}
                  </div>
                </div>
                <p className="text-sm">{interaction.notes}</p>
                {interaction.syncStatus === "local" && (
                  <Badge variant="outline" className="mt-2">Not synced</Badge>
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactInteractions;
