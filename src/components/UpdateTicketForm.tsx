import { useState, useEffect } from "react";
import { useLeadContext, Ticket } from "@/contexts/LeadContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Star } from "lucide-react";
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
  const [status, setStatus] = useState<"OPEN" | "IN PROGRESS" | "CLOSED">("OPEN");
  const [remarks, setRemarks] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<string[]>([]);
  const [priority, setPriority] = useState(false);
  const [effortInMinutes, setEffortInMinutes] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [allImages, setAllImages] = useState<string[]>([]);

  useEffect(() => {
    const loadPhotos = async () => {
      if (ticket) {
        setTargetDate(ticket.targetDate.split('T')[0]);
        setStatus(ticket.status);
        setRemarks(ticket.remarks || "");
        setRootCause(ticket.rootCause || "");
        setScreenshots(ticket.screenshots || []);
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
            setAllImages([...photoUrls, ...screenshots]);
          } catch (error) {
            console.error("Failed to load existing photos:", error);
            setExistingPhotos([]);
            setAllImages([...screenshots]);
          }
        } else {
          setExistingPhotos([]);
          setAllImages([...screenshots]);
        }
      }
    };
    
    loadPhotos();
  }, [ticket, screenshots]);

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
  };

  return (
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
              <Select value={status} onValueChange={(value) => setStatus(value as "OPEN" | "IN PROGRESS" | "CLOSED")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN PROGRESS">In Progress</SelectItem>
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
            <Label htmlFor="screenshots">Upload Images</Label>
            <p className="text-xs text-muted-foreground">Upload files or paste screenshots (Ctrl+V / Cmd+V)</p>
            <Input
              id="screenshots"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
            />
            
            {/* Existing photos from server */}
            {existingPhotos.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Existing Photos</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {existingPhotos.map((photoUrl, index) => (
                    <div 
                      key={`existing-${index}`} 
                      className="relative aspect-[4/3] bg-muted rounded-md overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => {
                        setLightboxIndex(index);
                        setLightboxOpen(true);
                      }}
                    >
                      <img
                        src={photoUrl}
                        alt={`Existing photo ${index + 1}`}
                        className="w-full h-full object-contain"
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
            {screenshots.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">New Screenshots</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {screenshots.map((screenshot, index) => (
                    <div 
                      key={`new-${index}`} 
                      className="relative aspect-[4/3] bg-muted rounded-md overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => {
                        setLightboxIndex(existingPhotos.length + index);
                        setLightboxOpen(true);
                      }}
                    >
                      <img
                        src={screenshot}
                        alt={`Screenshot ${index + 1}`}
                        className="w-full h-full object-contain"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage(index);
                        }}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {status === "CLOSED" && (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="rootCause">Root Cause</Label>
                <Select value={rootCause} onValueChange={setRootCause}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select root cause" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Software">Software</SelectItem>
                    <SelectItem value="Data">Data</SelectItem>
                    <SelectItem value="Usage">Usage</SelectItem>
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>

      <ImageLightbox
        images={allImages}
        currentIndex={lightboxIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        onNavigate={setLightboxIndex}
      />
    </Dialog>
  );
};
