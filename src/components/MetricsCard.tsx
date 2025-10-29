import { Card, CardContent } from "@/components/ui/card";

interface MetricsCardProps {
  todaysInteractions: number;
  leadsClosedThisMonth: number;
  onTodaysClick?: () => void;
  onClosedClick?: () => void;
}

export const MetricsCard = ({ todaysInteractions, leadsClosedThisMonth, onTodaysClick, onClosedClick }: MetricsCardProps) => {
  return (
    <>
      <Card 
        className="cursor-pointer hover:bg-accent transition-colors h-full"
        onClick={onTodaysClick}
      >
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Today's Interactions</p>
          <p className="text-2xl font-bold text-foreground">{todaysInteractions}</p>
        </CardContent>
      </Card>
      <Card 
        className="cursor-pointer hover:bg-accent transition-colors h-full"
        onClick={onClosedClick}
      >
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">Closed This Month</p>
          <p className="text-2xl font-bold text-foreground">
            ₹{leadsClosedThisMonth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </CardContent>
      </Card>
    </>
  );
};
