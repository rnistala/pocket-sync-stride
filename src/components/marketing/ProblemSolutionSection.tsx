import { AlertTriangle, CheckCircle } from "lucide-react";

interface ProblemSolutionItem {
  problem: string;
  solution: string;
}

const items: ProblemSolutionItem[] = [
  {
    problem: "Customer information scattered across spreadsheets, emails, and sticky notes",
    solution: "Complete 360° view of every customer in one place",
  },
  {
    problem: "Missed follow-ups costing you deals and damaging relationships",
    solution: "Smart calendar-based reminders ensure you never miss a beat",
  },
  {
    problem: "No visibility into support effort and team performance",
    solution: "Detailed dashboards with effort tracking by customer and root cause",
  },
  {
    problem: "Hours wasted researching prospects before calls",
    solution: "AI-powered company research delivers insights in seconds",
  },
];

const ProblemSolutionSection = () => {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Sound Familiar?
          </h2>
          <p className="text-lg text-muted-foreground">
            Common challenges that Opterix 360 solves for businesses every day
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {items.map((item, index) => (
            <div
              key={index}
              className="grid md:grid-cols-2 gap-4 items-stretch"
            >
              <div className="flex items-center gap-4 p-5 rounded-xl bg-destructive/5 border border-destructive/20">
                <AlertTriangle className="h-6 w-6 text-destructive shrink-0" />
                <p className="text-sm text-foreground/80">{item.problem}</p>
              </div>
              <div className="flex items-center gap-4 p-5 rounded-xl bg-primary/5 border border-primary/20">
                <CheckCircle className="h-6 w-6 text-primary shrink-0" />
                <p className="text-sm text-foreground/80">{item.solution}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProblemSolutionSection;
