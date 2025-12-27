import { useState, useMemo, useEffect } from "react";
import { useLeadContext, Ticket, DB_NAME, DB_VERSION } from "@/contexts/LeadContext";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Upload, X, Check, ChevronsUpDown, ArrowLeft, UserPlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ImageLightbox } from "@/components/ImageLightbox";
import { getApiRoot } from "@/lib/config";

export default function EditTicket() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tickets, contacts, users, updateTicket, fetchUsers } = useLeadContext();
  
  const [isLoading, setIsLoading] = useState(true);
  const [ticket, setTicket] = useState<Ticket | undefined>(tickets.find(t => String(t.id) === id));
  
  const [contactOpen, setContactOpen] = useState(false);
  const [contactId, setContactId] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [allImages, setAllImages] = useState<string[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  
  // Assign To state
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [userOpen, setUserOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [originalAssignedTo, setOriginalAssignedTo] = useState<number | undefined>();

  // Fetch users on mount
  useEffect(() => {
    if (users.length === 0) {
      fetchUsers();
    }
  }, [users.length, fetchUsers]);

  // Normalize issue type to handle legacy display names
  const normalizeIssueType = (type: string): string => {
    const legacyMap: Record<string, string> = {
      'Bug': 'BR',
      'Feature Request': 'FR',
      'Support': 'SR',
      'Meeting': 'MG',
    };
    return legacyMap[type] || type;
  };

  // Initialize form with ticket data
  useEffect(() => {
    const loadPhotos = async () => {
      if (ticket) {
        setContactId(ticket.contactId);
        setIssueType(normalizeIssueType(ticket.issueType));
        setDescription(ticket.description);
        setScreenshots(ticket.screenshots || []);
        setAssignedTo(ticket.assigned_to ? String(ticket.assigned_to) : "");
        setOriginalAssignedTo(ticket.assigned_to);
        
        // Load existing photos from server
        if (ticket.photo && Array.isArray(ticket.photo) && ticket.photo.length > 0) {
          try {
            const apiRoot = await getApiRoot();
            const photoUrls = ticket.photo.map((photoData: any) => {
              let photoPath = "";
              
              if (typeof photoData === "string") {
                try {
                  const parsed = JSON.parse(photoData);
                  photoPath = parsed.path || "";
                } catch {
                  photoPath = photoData;
                }
              } else if (photoData && typeof photoData === "object" && "path" in photoData) {
                photoPath = photoData.path || "";
              }
              
              if (photoPath) {
                const cleanPath = photoPath.startsWith('/') ? photoPath : `/${photoPath}`;
                return `${apiRoot}/photos${cleanPath}`;
              }
              return "";
            }).filter(Boolean);
            
            setExistingPhotos(photoUrls);
          } catch (error) {
            console.error("Failed to load existing photos:", error);
            setExistingPhotos([]);
          }
        } else {
          setExistingPhotos([]);
        }
      }
    };
    
    loadPhotos();
  }, [ticket]);

  // Update all images when existing photos or screenshots change
  useEffect(() => {
    setAllImages([...existingPhotos, ...screenshots]);
  }, [existingPhotos, screenshots]);

  // Load ticket from IndexedDB if not found in context (handles newly created tickets)
  useEffect(() => {
    const loadTicket = async () => {
      if (!ticket && id && isLoading) {
        console.log("[EDIT TICKET] Ticket not found in context, loading from IndexedDB...");
        console.log("[EDIT TICKET] Looking for ticket ID:", id);
        console.log("[EDIT TICKET] Available ticket IDs in context:", tickets.map(t => t.id));
        try {
          const request = indexedDB.open(DB_NAME, DB_VERSION);
          
          request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction("tickets", "readonly");
            const store = transaction.objectStore("tickets");
            const getRequest = store.get(id);
            
            getRequest.onsuccess = () => {
              if (getRequest.result) {
                console.log("[EDIT TICKET] Ticket loaded from IndexedDB:", getRequest.result);
                setTicket(getRequest.result);
              }
              setIsLoading(false);
            };
            
            getRequest.onerror = () => {
              console.error("[EDIT TICKET] Failed to load ticket from IndexedDB");
              setIsLoading(false);
            };
          };
          
          request.onerror = () => {
            console.error("[EDIT TICKET] Failed to open IndexedDB");
            setIsLoading(false);
          };
        } catch (error) {
          console.error("[EDIT TICKET] Error loading ticket:", error);
          setIsLoading(false);
        }
      } else if (ticket) {
        setIsLoading(false);
      }
    };
    
    loadTicket();
  }, [id, ticket, isLoading]);

  // Reactive ticket lookup - update when tickets array changes
  useEffect(() => {
    if (!ticket && id) {
      const foundTicket = tickets.find(t => String(t.id) === id);
      if (foundTicket) {
        console.log("[EDIT TICKET] Ticket found in updated context:", foundTicket);
        setTicket(foundTicket);
        setIsLoading(false);
      }
    }
  }, [tickets, id, ticket]);

  // Get selected contact display name
  const selectedContact = useMemo(() => 
    contacts.find(c => c.id === contactId),
    [contacts, contactId]
  );

  // Get selected user display name
  const selectedUser = useMemo(() => 
    users.find(u => u.id === assignedTo),
    [users, assignedTo]
  );

  // Filter contacts by search
  const filteredContacts = useMemo(() => {
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

  // Filter users by search
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users.slice(0, 50);
    
    const query = userSearch.toLowerCase();
    return users
      .filter(user => 
        user.name.toLowerCase().includes(query) ||
        (user.email && user.email.toLowerCase().includes(query))
      )
      .slice(0, 50);
  }, [users, userSearch]);

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

    if (!ticket) return;

    const newAssignedTo = assignedTo ? Number(assignedTo) : undefined;
    const assignedUser = users.find(u => u.id === assignedTo);

    const updatedTicket: Ticket = {
      ...ticket,
      contactId,
      issueType,
      description,
      screenshots,
      assigned_to: newAssignedTo,
      assignedToName: assignedUser?.name || "",
    };

    await updateTicket(updatedTicket, originalAssignedTo);

    toast({
      title: "Ticket Updated",
      description: "The ticket details have been updated successfully",
    });

    navigate(-1);
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
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-textured flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading ticket...</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-textured flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Ticket not found</p>
          <Button onClick={() => navigate(-1)}>Back to Tickets</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-textured">
        <div className="sticky top-0 z-10 bg-textured backdrop-blur-sm border-b border-border">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-lg font-semibold text-foreground">Edit Ticket Details</h1>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contact">Contact *</Label>
              <Popover open={contactOpen} onOpenChange={setContactOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={contactOpen}
                    className="w-full justify-between"
                  >
                    {selectedContact 
                      ? `${selectedContact.name}${selectedContact.company ? ` - ${selectedContact.company}` : ''}`
                      : "Select contact..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] max-w-[92vw] p-0">
                  <Command shouldFilter={false}>
                    <CommandInput 
                      placeholder="Search contact..." 
                      value={contactSearch}
                      onValueChange={setContactSearch}
                    />
                    <CommandList>
                      <CommandEmpty>No contact found.</CommandEmpty>
                      <CommandGroup>
                        {filteredContacts.map((contact) => (
                          <CommandItem
                            key={contact.id}
                            value={contact.id}
                            onSelect={(currentValue) => {
                              setContactId(currentValue === contactId ? "" : currentValue);
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
                              {contact.company && (
                                <span className="text-xs text-muted-foreground">{contact.company}</span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Assign To field */}
            <div className="space-y-2">
              <Label htmlFor="assignTo">Assign To</Label>
              <Popover open={userOpen} onOpenChange={setUserOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={userOpen}
                    className="w-full justify-between"
                  >
                    {selectedUser ? (
                      <div className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        <span>{selectedUser.name}</span>
                        {selectedUser.email && (
                          <span className="text-xs text-muted-foreground">({selectedUser.email})</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Select user to assign...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] max-w-[92vw] p-0">
                  <Command shouldFilter={false}>
                    <CommandInput 
                      placeholder="Search user..." 
                      value={userSearch}
                      onValueChange={setUserSearch}
                    />
                    <CommandList>
                      <CommandEmpty>No user found.</CommandEmpty>
                      <CommandGroup>
                        {/* Option to unassign */}
                        <CommandItem
                          value=""
                          onSelect={() => {
                            setAssignedTo("");
                            setUserOpen(false);
                            setUserSearch("");
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              !assignedTo ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="text-muted-foreground">Unassigned</span>
                        </CommandItem>
                        {filteredUsers.map((user) => (
                          <CommandItem
                            key={user.id}
                            value={user.id}
                            onSelect={(currentValue) => {
                              setAssignedTo(currentValue === assignedTo ? "" : currentValue);
                              setUserOpen(false);
                              setUserSearch("");
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                assignedTo === user.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{user.name}</span>
                              {user.email && (
                                <span className="text-xs text-muted-foreground">{user.email}</span>
                              )}
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
                <SelectTrigger>
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
                placeholder="Describe the issue"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Screenshots</Label>
              
              {/* Existing photos from server */}
              {existingPhotos.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Existing Photos</p>
                  <div className="flex flex-wrap gap-2">
                    {existingPhotos.map((photoUrl, index) => (
                      <div key={`existing-${index}`} className="relative group">
                        <img
                          src={photoUrl}
                          alt={`Existing photo ${index + 1}`}
                          className="h-20 w-20 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => {
                            setLightboxIndex(index);
                            setLightboxOpen(true);
                          }}
                          onError={(e) => {
                            console.error("Failed to load image:", photoUrl);
                            e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23ddd' width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999'%3EError%3C/text%3E%3C/svg%3E";
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* New screenshots */}
              <div>
                {screenshots.length > 0 && (
                  <p className="text-xs text-muted-foreground mb-2">New Screenshots</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {screenshots.map((screenshot, index) => (
                    <div key={`new-${index}`} className="relative group">
                      <img
                        src={screenshot}
                        alt={`Screenshot ${index + 1}`}
                        className="h-20 w-20 object-cover rounded-md cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => {
                          setLightboxIndex(existingPhotos.length + index);
                          setLightboxOpen(true);
                        }}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeScreenshot(index);
                        }}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <label className="h-20 w-20 border-2 border-dashed border-muted-foreground/25 rounded-md flex items-center justify-center cursor-pointer hover:border-muted-foreground/50 transition-colors">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                You can also paste images directly (Ctrl/Cmd + V)
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </div>
      </div>

      <ImageLightbox
        images={allImages}
        currentIndex={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        onNavigate={setLightboxIndex}
      />
    </>
  );
}

