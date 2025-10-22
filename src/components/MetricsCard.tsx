import { Card, CardContent } from "@/components/ui/card";

interface MetricsCardProps {
  todaysLeads: number;
  leadsClosedThisMonth: number;
  onClosedClick?: () => void;
}

export const MetricsCard = ({ todaysLeads, leadsClosedThisMonth, onClosedClick }: MetricsCardProps) => {
  return (
    <div className="grid grid-cols-2 gap-3 mb-4">
      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Today's Leads</p>
          <p className="text-2xl font-bold text-foreground">{todaysLeads}</p>
        </CardContent>
      </Card>
      <Card 
        className="cursor-pointer hover:bg-accent transition-colors"
        onClick={onClosedClick}
      >
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Closed This Month</p>
          <p className="text-2xl font-bold text-foreground">{leadsClosedThisMonth}</p>
        </CardContent>
      </Card>
    </div>
  );
};
