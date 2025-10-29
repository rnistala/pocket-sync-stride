import { Card, CardContent } from "@/components/ui/card";
import { useLeadContext } from "@/contexts/LeadContext";
import { useNavigate } from "react-router-dom";

export const TicketsWidget = () => {
  const { tickets } = useLeadContext();
  const navigate = useNavigate();

  const openTickets = tickets.filter(t => t.status === "open");

  const handleClick = () => {
    navigate("/tickets?filter=open");
  };

  return (
    <Card 
      className="cursor-pointer hover:bg-accent transition-colors h-full"
      onClick={handleClick}
    >
      <CardContent className="p-4 flex flex-col">
        <p className="text-xs text-muted-foreground mb-2 h-8 flex items-start">Open Tickets</p>
        <p className="text-2xl font-bold text-foreground">{openTickets.length}</p>
      </CardContent>
    </Card>
  );
};
