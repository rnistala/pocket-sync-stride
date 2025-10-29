import { Card, CardContent } from "@/components/ui/card";
import { formatNumberShort } from "@/lib/utils";
import { startTransition } from "react";

interface MetricsCardProps {
  todaysInteractions: number;
  leadsClosedThisMonth: number;
  onTodaysClick?: () => void;
  onClosedClick?: () => void;
}

export const MetricsCard = ({ todaysInteractions, leadsClosedThisMonth, onTodaysClick, onClosedClick }: MetricsCardProps) => {
  const handleTodaysClick = () => {
    if (onTodaysClick) {
      startTransition(() => {
        onTodaysClick();
      });
    }
  };

  const handleClosedClick = () => {
    if (onClosedClick) {
      startTransition(() => {
        onClosedClick();
      });
    }
  };

  return (
    <>
      <Card 
        className="cursor-pointer hover:bg-accent transition-colors h-full"
        onClick={handleTodaysClick}
      >
        <CardContent className="p-4 flex flex-col">
          <p className="text-xs text-muted-foreground mb-2 h-8 flex items-start">Today's Interactions</p>
          <p className="text-2xl font-bold text-foreground">{todaysInteractions}</p>
        </CardContent>
      </Card>
      <Card 
        className="cursor-pointer hover:bg-accent transition-colors h-full"
        onClick={handleClosedClick}
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
