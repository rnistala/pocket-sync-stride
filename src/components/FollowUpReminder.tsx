import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useLeadContext } from "@/contexts/LeadContext";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

export const FollowUpReminder = () => {
  const { contacts } = useLeadContext();
  const navigate = useNavigate();

  const todayFollowUps = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return contacts.filter((contact) => {
      if (!contact.followup_on) return false;
      const followUpDate = new Date(contact.followup_on);
      followUpDate.setHours(0, 0, 0, 0);
      return followUpDate.getTime() === today.getTime();
    });
  }, [contacts]);

  const handleContactClick = (contactId: number | string) => {
    navigate(`/contact/${contactId}/details`);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 relative">
          <Bell className="h-4 w-4" />
          {todayFollowUps.length > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
            >
              {todayFollowUps.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Follow-ups Due Today</h3>
          </div>
          {todayFollowUps.length === 0 ? (
            <p className="text-sm text-muted-foreground">No follow-ups due today</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {todayFollowUps.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => handleContactClick(contact.id)}
                  className="p-3 rounded-lg border border-border hover:bg-accent cursor-pointer transition-colors"
                >
                  <div className="font-medium text-sm">{contact.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {contact.company} • {contact.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
