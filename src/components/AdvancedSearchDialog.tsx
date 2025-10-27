import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Filter, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Contact } from "@/hooks/useLeadStorage";

export interface AdvancedFilters {
  statuses: string[];
  city: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
}

interface AdvancedSearchDialogProps {
  contacts: Contact[];
  filters: AdvancedFilters;
  onApplyFilters: (filters: AdvancedFilters) => void;
  onClearFilters: () => void;
}

export const AdvancedSearchDialog = ({ contacts, filters, onApplyFilters, onClearFilters }: AdvancedSearchDialogProps) => {
  const [open, setOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<AdvancedFilters>(filters);

  // Get unique statuses and cities from contacts
  const uniqueStatuses = useMemo(() => {
    const statuses = new Set(contacts.map(c => c.status).filter(Boolean));
    return Array.from(statuses).sort();
  }, [contacts]);

  const uniqueCities = useMemo(() => {
    const cities = new Set(contacts.map(c => c.city).filter(Boolean));
    return Array.from(cities).sort();
  }, [contacts]);

  const hasActiveFilters = filters.statuses.length > 0 || filters.city || filters.dateFrom || filters.dateTo;
  const activeFilterCount = [
    filters.statuses.length > 0,
    Boolean(filters.city),
    Boolean(filters.dateFrom),
    Boolean(filters.dateTo)
  ].filter(Boolean).length;

  const handleStatusToggle = (status: string) => {
    setLocalFilters(prev => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter(s => s !== status)
        : [...prev.statuses, status]
    }));
  };

  const handleApply = () => {
    onApplyFilters(localFilters);
    setOpen(false);
  };

  const handleClear = () => {
    const emptyFilters: AdvancedFilters = {
      statuses: [],
      city: "",
      dateFrom: undefined,
      dateTo: undefined
    };
    setLocalFilters(emptyFilters);
    onClearFilters();
    setOpen(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      // Reset local filters to current filters when opening
      setLocalFilters(filters);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={hasActiveFilters ? "default" : "outline"} size="sm" className="h-8 relative">
          <Filter className="h-3.5 w-3.5 mr-1.5" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1.5 h-4 px-1 text-[10px] font-bold min-w-[16px] justify-center">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Advanced Filters</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Status Filter */}
          <div className="space-y-2">
            <Label>Status</Label>
            <div className="flex flex-wrap gap-2">
              {uniqueStatuses.map(status => (
                <Button
                  key={status}
                  variant={localFilters.statuses.includes(status) ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleStatusToggle(status)}
                  className="h-7 text-xs"
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>

          {/* City Filter */}
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <div className="flex gap-2">
              <Select
                value={localFilters.city || undefined}
                onValueChange={(value) => setLocalFilters(prev => ({ ...prev, city: value }))}
              >
                <SelectTrigger id="city" className="flex-1">
                  <SelectValue placeholder="All cities" />
                </SelectTrigger>
                <SelectContent>
                  {uniqueCities.map(city => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {localFilters.city && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setLocalFilters(prev => ({ ...prev, city: "" }))}
                  className="shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="space-y-2">
            <Label>Follow-up Date Range</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">From</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-9 text-xs",
                        !localFilters.dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {localFilters.dateFrom ? format(localFilters.dateFrom, "PP") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={localFilters.dateFrom}
                      onSelect={(date) => setLocalFilters(prev => ({ ...prev, dateFrom: date }))}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">To</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-9 text-xs",
                        !localFilters.dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {localFilters.dateTo ? format(localFilters.dateTo, "PP") : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={localFilters.dateTo}
                      onSelect={(date) => setLocalFilters(prev => ({ ...prev, dateTo: date }))}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={handleClear}>
            Clear All
          </Button>
          <Button onClick={handleApply}>
            Apply Filters
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
