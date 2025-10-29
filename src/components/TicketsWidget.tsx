import { Card, CardContent } from "@/components/ui/card";
import { useLeadContext } from "@/contexts/LeadContext";
import { useNavigate } from "react-router-dom";
import { useMemo, startTransition } from "react";

export const TicketsWidget = () => {
  const { tickets, fetchTickets } = useLeadContext();
  const navigate = useNavigate();

  const openTicketsCount = useMemo(() => 
    tickets.filter(t => t.status === "OPEN").length
  , [tickets]);

  const handleClick = async () => {
    await fetchTickets();
    startTransition(() => {
      navigate("/tickets?filter=OPEN");
    });
  };

  return (
    <Card 
      className="cursor-pointer hover:bg-accent transition-colors h-full"
      onClick={handleClick}
    >
      <CardContent className="p-4 flex flex-col">
        <p className="text-xs text-muted-foreground mb-2 h-8 flex items-start">Open Tickets</p>
        <p className="text-2xl font-bold text-foreground">{openTicketsCount}</p>
      </CardContent>
    </Card>
  );
};
