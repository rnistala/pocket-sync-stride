import { useState, useEffect } from "react";
import { useLeadContext, Ticket } from "@/contexts/LeadContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface UpdateTicketFormProps {
  ticket: Ticket;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const UpdateTicketForm = ({ ticket, open, onOpenChange }: UpdateTicketFormProps) => {
  const { updateTicket } = useLeadContext();
  const [targetDate, setTargetDate] = useState("");
  const [remarks, setRemarks] = useState("");
  const [rootCause, setRootCause] = useState("");
  const [screenshots, setScreenshots] = useState<string[]>([]);

  useEffect(() => {
    if (ticket) {
      setTargetDate(ticket.targetDate.split('T')[0]);
      setRemarks(ticket.remarks || "");
      setRootCause(ticket.rootCause || "");
      setScreenshots(ticket.screenshots || []);
    }
  }, [ticket]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const updatedTicket: Ticket = {
      ...ticket,
      targetDate: new Date(targetDate).toISOString(),
      remarks: remarks.trim(),
      rootCause: rootCause.trim(),
      screenshots,
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Update Ticket</DialogTitle>
          <DialogDescription>
            Update target date, remarks, and analysis for this ticket
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label htmlFor="remarks">Remarks / Analysis</Label>
            <Textarea
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add your analysis or remarks about this ticket..."
              className="min-h-[120px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="screenshots">Upload Images</Label>
            <Input
              id="screenshots"
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
            />
            {screenshots.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {screenshots.map((screenshot, index) => (
                  <div key={index} className="relative aspect-[4/3] bg-muted rounded-md overflow-hidden flex items-center justify-center">
                    <img
                      src={screenshot}
                      alt={`Screenshot ${index + 1}`}
                      className="w-full h-full object-contain"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={() => handleRemoveImage(index)}
                    >
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {ticket.status === "closed" && (
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
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
