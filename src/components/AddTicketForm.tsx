import { useState, useMemo, useEffect } from "react";
import { useLeadContext } from "@/contexts/LeadContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Upload, X, Check, ChevronsUpDown, Star } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export const AddTicketForm = () => {
  const { contacts, addTicket } = useLeadContext();
  const [open, setOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactId, setContactId] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [priority, setPriority] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get selected contact display name
  const selectedContact = useMemo(() => 
    contacts.find(c => c.id === contactId),
    [contacts, contactId]
  );

  // Filter contacts by search (contacts are already filtered by API)
  const filteredContacts = useMemo(() => {
    // Apply search filter
    if (!contactSearch.trim()) return contacts.slice(0, 50);
    
    const query = contactSearch.toLowerCase();
    return contacts
      .filter(contact => 
        contact.name.toLowerCase().includes(query) ||
        contact.company.toLowerCase().includes(query) ||
        (contact.phone && contact.phone.includes(query))
      )
      .slice(0, 50);
  }, [contacts, contactSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contactId || !issueType || !description) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const newTicket = await addTicket({
        contactId,
        reportedDate: new Date().toISOString(),
        targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Default to 7 days from now
        issueType,
        status: "OPEN",
        description,
        screenshots,
        priority,
      });

      toast({
        title: "Ticket Created",
        description: newTicket?.ticketId 
          ? `Ticket ${newTicket.ticketId} has been created successfully`
          : "Action item has been added successfully",
      });

      // Reset form
      setContactId("");
      setContactSearch("");
      setIssueType("");
      setDescription("");
      setScreenshots([]);
      setPriority(false);
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setScreenshots(prev => [...prev, result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeScreenshot = (index: number) => {
    setScreenshots(prev => prev.filter((_, i) => i !== index));
  };

  const handlePaste = (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    Array.from(items).forEach(item => {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            setScreenshots(prev => [...prev, result]);
            toast({
              title: "Image Pasted",
              description: "Screenshot added from clipboard",
            });
          };
          reader.readAsDataURL(file);
        }
      }
    });
  };

  useEffect(() => {
    if (open) {
      document.addEventListener('paste', handlePaste);
      return () => document.removeEventListener('paste', handlePaste);
    }
  }, [open]);

  // Auto-select contact if only one is available (customer case)
  useEffect(() => {
    if (open && contacts.length === 1 && !contactId) {
      setContactId(contacts[0].id);
    }
  }, [open, contacts, contactId]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[92vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>New Ticket</DialogTitle>
          <DialogDescription>
            Add a new ticket with contact details and issue information
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contact">Contact *</Label>
            <Popover open={contactOpen} onOpenChange={setContactOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="contact"
                  variant="outline"
                  role="combobox"
                  aria-expanded={contactOpen}
                  className="w-full justify-between"
                >
                  {selectedContact ? (
                    <span className="truncate">{selectedContact.name} - {selectedContact.company}</span>
                  ) : (
                    <span className="text-muted-foreground">Search and select contact...</span>
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[400px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput 
                    placeholder="Search by name, company, or phone..." 
                    value={contactSearch}
                    onValueChange={setContactSearch}
                  />
                  <CommandList>
                    <CommandEmpty>No contacts found.</CommandEmpty>
                    <CommandGroup>
                      {filteredContacts.map((contact) => (
                        <CommandItem
                          key={contact.id}
                          value={contact.id}
                          onSelect={(currentValue) => {
                            setContactId(currentValue);
                            setContactOpen(false);
                            setContactSearch("");
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              contactId === contact.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">{contact.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {contact.company}
                              {contact.phone && ` • ${contact.phone}`}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="issueType">Issue Type *</Label>
            <Select value={issueType} onValueChange={setIssueType}>
              <SelectTrigger id="issueType">
                <SelectValue placeholder="Select issue type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BR">Problem</SelectItem>
                <SelectItem value="FR">New Work</SelectItem>
                <SelectItem value="SR">Support</SelectItem>
                <SelectItem value="MG">Meeting</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue or action item..."
              className="min-h-[120px]"
              required
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPriority(!priority)}
              className={priority ? "bg-accent" : ""}
            >
              <Star className={`h-4 w-4 mr-2 ${priority ? 'fill-yellow-500 text-yellow-500' : ''}`} />
              {priority ? 'Priority Ticket' : 'Mark as Priority'}
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Screenshots (optional)</Label>
            <p className="text-xs text-muted-foreground">Upload files or paste screenshots (Ctrl+V / Cmd+V)</p>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("screenshot-upload")?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Images
                </Button>
                <input
                  id="screenshot-upload"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {screenshots.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    {screenshots.length} image{screenshots.length > 1 ? 's' : ''} added
                  </span>
                )}
              </div>

              {screenshots.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                  {screenshots.map((screenshot, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={screenshot}
                        alt={`Screenshot ${idx + 1}`}
                        className="rounded-lg border border-border w-full h-24 object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeScreenshot(idx)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Ticket"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
