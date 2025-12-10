import { format, setMonth, setYear } from "date-fns";
import { CaptionProps, useNavigation } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

const MONTHS = [
  "January", "February", "March", "April",
  "May", "June", "July", "August",
  "September", "October", "November", "December"
];

const YEARS = Array.from({ length: 11 }, (_, i) => 2020 + i); // 2020-2030

export function CalendarCaption({ displayMonth }: CaptionProps) {
  const { goToMonth, previousMonth, nextMonth } = useNavigation();
  const [monthOpen, setMonthOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);

  const currentMonth = displayMonth.getMonth();
  const currentYear = displayMonth.getFullYear();

  const handleMonthSelect = (monthIndex: number) => {
    const newDate = setMonth(displayMonth, monthIndex);
    goToMonth(newDate);
    setMonthOpen(false);
  };

  const handleYearSelect = (year: number) => {
    const newDate = setYear(displayMonth, year);
    goToMonth(newDate);
    setYearOpen(false);
  };

  return (
    <div className="flex justify-center items-center relative pt-1">
      <Button
        variant="outline"
        className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute left-1"
        onClick={() => previousMonth && goToMonth(previousMonth)}
        disabled={!previousMonth}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-1 text-sm font-medium">
        <Popover open={monthOpen} onOpenChange={setMonthOpen}>
          <PopoverTrigger asChild>
            <button className="hover:bg-accent hover:text-accent-foreground rounded px-1.5 py-0.5 transition-colors">
              {format(displayMonth, "MMMM")}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2 pointer-events-auto" align="center">
            <div className="grid grid-cols-3 gap-1">
              {MONTHS.map((month, index) => (
                <Button
                  key={month}
                  variant={index === currentMonth ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-8 text-xs",
                    index === currentMonth && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => handleMonthSelect(index)}
                >
                  {month.slice(0, 3)}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Popover open={yearOpen} onOpenChange={setYearOpen}>
          <PopoverTrigger asChild>
            <button className="hover:bg-accent hover:text-accent-foreground rounded px-1.5 py-0.5 transition-colors">
              {format(displayMonth, "yyyy")}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2 pointer-events-auto" align="center">
            <div className="grid grid-cols-3 gap-1">
              {YEARS.map((year) => (
                <Button
                  key={year}
                  variant={year === currentYear ? "default" : "ghost"}
                  size="sm"
                  className={cn(
                    "h-8 text-xs",
                    year === currentYear && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => handleYearSelect(year)}
                >
                  {year}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <Button
        variant="outline"
        className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 absolute right-1"
        onClick={() => nextMonth && goToMonth(nextMonth)}
        disabled={!nextMonth}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
