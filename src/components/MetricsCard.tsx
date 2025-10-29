import { Card, CardContent } from "@/components/ui/card";
import { formatNumberShort } from "@/lib/utils";

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
        <CardContent className="p-4 flex flex-col">
          <p className="text-xs text-muted-foreground mb-2 h-8 flex items-start">Today's Interactions</p>
          <p className="text-2xl font-bold text-foreground">{todaysInteractions}</p>
        </CardContent>
      </Card>
      <Card 
        className="cursor-pointer hover:bg-accent transition-colors h-full"
        onClick={onClosedClick}
      >
        <CardContent className="p-4 flex flex-col">
          <p className="text-xs text-muted-foreground mb-2 h-8 flex items-start">Sales This Month (₹)</p>
          <p className="text-2xl font-bold text-foreground">
            {formatNumberShort(leadsClosedThisMonth)}
          </p>
        </CardContent>
      </Card>
    </>
  );
};
