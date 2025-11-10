import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getIssueTypeLabel } from "@/lib/issueTypeUtils";

interface TicketFiltersDialogProps {
  statusFilter: string;
  issueTypeFilter: string;
  contactFilter: string;
  onStatusChange: (value: string) => void;
  onIssueTypeChange: (value: string) => void;
  onContactChange: (value: string) => void;
  issueTypes: string[];
  contacts: Array<{ id: string; name: string }>;
  mounted: boolean;
}

export function TicketFiltersDialog({
  statusFilter,
  issueTypeFilter,
  contactFilter,
  onStatusChange,
  onIssueTypeChange,
  onContactChange,
  issueTypes,
  contacts,
  mounted,
}: TicketFiltersDialogProps) {
  const [open, setOpen] = useState(false);

  const activeFiltersCount = [
    statusFilter !== "all",
    issueTypeFilter !== "all",
    contactFilter !== "all",
  ].filter(Boolean).length;

  const handleClearAll = () => {
    onStatusChange("all");
    onIssueTypeChange("all");
    onContactChange("all");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {activeFiltersCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Advanced Filters</DialogTitle>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="h-8 text-xs"
              >
                Clear All
              </Button>
            )}
          </div>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={statusFilter} onValueChange={onStatusChange}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="OPEN">OPEN</SelectItem>
                <SelectItem value="IN PROGRESS">IN PROGRESS</SelectItem>
                <SelectItem value="CLOSED">CLOSED</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Issue Type</label>
            <Select value={issueTypeFilter} onValueChange={onIssueTypeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Issue Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {mounted && issueTypes.map(type => (
                  <SelectItem key={type} value={type}>{getIssueTypeLabel(type)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Contact</label>
            <Select value={contactFilter} onValueChange={onContactChange}>
              <SelectTrigger>
                <SelectValue placeholder="Contact" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Contacts</SelectItem>
                {mounted && contacts.slice(0, 100).map(contact => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {contact.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
