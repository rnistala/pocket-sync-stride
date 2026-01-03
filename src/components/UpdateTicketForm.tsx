import { useState, useEffect } from "react";
import { useLeadContext, Ticket } from "@/contexts/LeadContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Star, Upload, X } from "lucide-react";
import { getApiRoot } from "@/lib/config";
import { ImageLightbox } from "@/components/ImageLightbox";

interface UpdateTicketFormProps {
  ticket: Ticket;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UpdateTicketForm = ({ ticket, open, onOpenChange }: UpdateTicketFormProps) => {
  const { updateTicket } = useLeadContext();
  const [targetDate, setTargetDate] = useState("");
  const [status, setStatus] = useState<"OPEN" | "IN PROGRESS" | "CLOSED" | "CLIENT QUERY">("OPEN");
  const [remarks, setRemarks] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [priority, setPriority] = useState(false);
  const [effortInMinutes, setEffortInMinutes] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [allImages, setAllImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadPhotos = async () => {
      if (ticket) {
        setTargetDate(ticket.targetDate.split('T')[0]);
        setStatus(ticket.status);
        setRemarks(ticket.remarks || "");
        // Auto-set root cause based on issue type
        if (ticket.issueType === "FR" || ticket.issueType === "New Work") {
          setRootCause("New Work");
        } else if (ticket.issueType === "MG" || ticket.issueType === "Meeting") {
          setRootCause("Meeting");
        } else {
          setRootCause(ticket.rootCause || "");
        }
        setScreenshots([]); // Always start fresh - existing images are in existingPhotos
        setPriority(ticket.priority || false);
        setEffortInMinutes(ticket.effort_minutes?.toString() || "");
        
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

  // Update allImages when existingPhotos or screenshots change
  useEffect(() => {
    setAllImages([...existingPhotos, ...screenshots]);
  }, [existingPhotos, screenshots]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshots((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveImage = (index: number) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;

    // Validate root cause is required when closing
    if (status === "CLOSED" && !rootCause.trim()) {
      toast({
        title: "Root Cause Required",
        description: "Please select a root cause before closing this ticket",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const updatedTicket: Ticket = {
        ...ticket,
        targetDate: new Date(targetDate).toISOString(),
        status,
        remarks: remarks.trim(),
        rootCause: rootCause.trim(),
        screenshots,
        priority,
        effort_minutes: effortInMinutes ? parseFloat(effortInMinutes) : undefined,
      };

      await updateTicket(updatedTicket);

      toast({
        title: "Ticket Updated",
        description: "The ticket has been updated successfully",
      });

      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[92vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Update Ticket</DialogTitle>
            <DialogDescription>
              Update target date, remarks, and analysis for this ticket
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetDate">Target Date *</Label>
                <Input
                  id="targetDate"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as "OPEN" | "IN PROGRESS" | "CLOSED" | "CLIENT QUERY")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OPEN">Open</SelectItem>
                    <SelectItem value="IN PROGRESS">In Progress</SelectItem>
                    <SelectItem value="CLIENT QUERY">Client Query</SelectItem>
                    <SelectItem value="CLOSED">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks / Analysis</Label>
              <Textarea
                id="remarks"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add your analysis or remarks about this ticket..."
                className="min-h-[120px]"
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
                          handleRemoveImage(index);
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
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                You can also paste images directly (Ctrl/Cmd + V)
              </p>
            </div>

            {status === "CLOSED" && (
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rootCause">Root Cause *</Label>
                  <Select value={rootCause} onValueChange={setRootCause}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select root cause" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Software">Software</SelectItem>
                      <SelectItem value="Data">Data</SelectItem>
                      <SelectItem value="Usage">Usage</SelectItem>
                      <SelectItem value="New Work">New Work</SelectItem>
                      <SelectItem value="Meeting">Meeting</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="effortInMinutes">Effort (Minutes)</Label>
                  <Input
                    id="effortInMinutes"
                    type="number"
                    step="1"
                    min="0"
                    value={effortInMinutes}
                    onChange={(e) => setEffortInMinutes(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ImageLightbox
        images={allImages}
        currentIndex={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        onNavigate={setLightboxIndex}
      />
    </>
  );
};
