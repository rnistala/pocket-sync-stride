import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLeadContext } from "@/contexts/LeadContext";
import { useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";

export const TicketsWidget = () => {
  const { tickets } = useLeadContext();
  const navigate = useNavigate();

  const openTickets = tickets.filter(t => t.status === "open");

  const handleClick = () => {
    navigate("/tickets?filter=open");
  };

  return (
    <Card 
      className="cursor-pointer hover:bg-accent transition-colors"
      onClick={handleClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-muted-foreground font-normal">Open Tickets</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <span className="text-3xl font-bold text-foreground">{openTickets.length}</span>
        </div>
      </CardContent>
    </Card>
  );
};
