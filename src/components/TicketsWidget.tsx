import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLeadContext } from "@/contexts/LeadContext";
import { useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";

export const TicketsWidget = () => {
  const { tickets, contacts } = useLeadContext();
  const navigate = useNavigate();

  const openTickets = tickets.filter(t => t.status === "open");
  const inProgressTickets = tickets.filter(t => t.status === "in-progress");

  const handleClick = () => {
    navigate("/tickets?filter=open");
  };

  return (
    <Card 
      className="cursor-pointer hover:bg-accent transition-colors"
      onClick={handleClick}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive" />
          Action Items
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Open</span>
          <Badge variant="destructive">{openTickets.length}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">In Progress</span>
          <Badge variant="secondary">{inProgressTickets.length}</Badge>
        </div>
        {openTickets.length > 0 && (
          <div className="mt-3 pt-3 border-t space-y-2">
            <p className="text-xs text-muted-foreground">Recent:</p>
            {openTickets.slice(0, 2).map(ticket => {
              const contact = contacts.find(c => c.id === ticket.contactId);
              return (
                <div key={ticket.id} className="text-xs">
                  <p className="font-medium text-foreground truncate">{contact?.name || "Unknown"}</p>
                  <p className="text-muted-foreground truncate">{ticket.issueType}</p>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
