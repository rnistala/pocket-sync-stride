import { useState, useEffect } from "react";
import { useLeadContext, Ticket } from "@/contexts/LeadContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

  useEffect(() => {
    if (ticket) {
      setTargetDate(ticket.targetDate.split('T')[0]);
      setRemarks(ticket.remarks || "");
      setRootCause(ticket.rootCause || "");
    }
  }, [ticket]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const updatedTicket: Ticket = {
      ...ticket,
      targetDate: new Date(targetDate).toISOString(),
      remarks: remarks.trim(),
      rootCause: rootCause.trim(),
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

          {ticket.status === "closed" && (
            <div className="space-y-2">
              <Label htmlFor="rootCause">Root Cause</Label>
              <Textarea
                id="rootCause"
                value={rootCause}
                onChange={(e) => setRootCause(e.target.value)}
                placeholder="Describe the root cause of this issue..."
                className="min-h-[120px]"
              />
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
