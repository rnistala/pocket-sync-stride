import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb, Camera, Filter, CheckCircle2, Sparkles } from "lucide-react";

const features = [
  {
    icon: Lightbulb,
    text: "Capture insights from tickets and follow-up conversations",
  },
  {
    icon: Camera,
    text: "Attach photos for visual reference and context",
  },
  {
    icon: Filter,
    text: "Filter by source: Tickets, Follow-ups, or Direct entries",
  },
  {
    icon: CheckCircle2,
    text: "Track which insights you've used for content",
  },
  {
    icon: Sparkles,
    text: "Build a knowledge base of customer feedback",
  },
];

const InspirationsSpotlight = () => {
  return (
    <section className="py-20 bg-gradient-to-br from-accent/5 via-background to-primary/5">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent">
              <Lightbulb className="h-4 w-4" />
              <span className="text-sm font-medium">Unique Feature</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
              Turn Customer Conversations into Content Gold
            </h2>
            <p className="text-lg text-muted-foreground">
              The Inspirations feature lets you capture valuable insights from every customer
              interaction. Build a library of real feedback, stories, and ideas to fuel your
              marketing, social media, and product development.
            </p>
            <ul className="space-y-4">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <li key={index} className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-accent" />
                    </div>
                    <span className="text-foreground/80 pt-1">{feature.text}</span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="relative">
            <Card className="border-accent/20 bg-gradient-to-br from-card to-accent/5 shadow-xl">
              <CardContent className="p-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-background/60 border border-border">
                    <Lightbulb className="h-5 w-5 text-accent" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">"Customer mentioned they love the mobile app..."</p>
                      <p className="text-xs text-muted-foreground mt-1">From: Follow-up call</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-background/60 border border-border">
                    <Lightbulb className="h-5 w-5 text-accent" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">"Feature request: Would love bulk import..."</p>
                      <p className="text-xs text-muted-foreground mt-1">From: Support ticket</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 border border-primary/20">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">"Saved 2 hours per day with automation..."</p>
                      <p className="text-xs text-muted-foreground mt-1">Used in newsletter</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            {/* Decorative elements */}
            <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-accent/10 blur-2xl" />
            <div className="absolute -bottom-4 -left-4 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default InspirationsSpotlight;
