import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  Users,
  MessageSquare,
  Calendar,
  Ticket,
  Smartphone,
  Zap,
  Shield,
  BarChart3,
  Sparkles,
  Phone,
  Star,
  Filter,
  ArrowRight,
  Briefcase,
  Headphones,
  UserCheck,
  Building,
} from "lucide-react";
import FeatureCard from "@/components/marketing/FeatureCard";
import UseCaseCard from "@/components/marketing/UseCaseCard";
import ProblemSolutionSection from "@/components/marketing/ProblemSolutionSection";
import InspirationsSpotlight from "@/components/marketing/InspirationsSpotlight";
import TechnicalExcellence from "@/components/marketing/TechnicalExcellence";

const Marketing = () => {
  const navigate = useNavigate();

  const coreFeatures = [
    {
      icon: Users,
      title: "360° Contact View",
      description: "See everything about your customer in one place — interactions, orders, tickets, and more.",
      benefits: [
        "Manage 10,000+ contacts effortlessly",
        "Star priority contacts for quick access",
        "Filter by status, city, score, or date",
        "Swipe between contacts on mobile",
      ],
    },
    {
      icon: MessageSquare,
      title: "Interaction Tracking",
      description: "Log every touchpoint with customers and never lose context again.",
      benefits: [
        "Log calls, WhatsApp, emails, meetings",
        "One-tap calling and WhatsApp integration",
        "Automatic follow-up date tracking",
        "Full interaction history per contact",
      ],
    },
    {
      icon: Ticket,
      title: "Ticket & Support Management",
      description: "Track and resolve customer issues with complete visibility and accountability.",
      benefits: [
        "Complete ticket lifecycle tracking",
        "Priority flagging for urgent issues",
        "Aging alerts for tickets 10+ days old",
        "Root cause categorization",
      ],
    },
    {
      icon: BarChart3,
      title: "Reporting & Dashboards",
      description: "Crystal clear visibility into effort, performance, and customer health.",
      benefits: [
        "Aggregate view across all customers",
        "Effort breakdown by root cause",
        "Monthly performance summaries",
        "Email reports directly to customers",
      ],
    },
    {
      icon: Sparkles,
      title: "AI-Powered Research",
      description: "Get instant company intelligence before your next call or meeting.",
      benefits: [
        "Company summary and industry info",
        "Owner/CEO and management contacts",
        "Recent news and developments",
        "One-click update to contact record",
      ],
    },
    {
      icon: Calendar,
      title: "Follow-Up Calendar",
      description: "Visual calendar of scheduled follow-ups so you never miss an opportunity.",
      benefits: [
        "Date-highlighted for easy scanning",
        "Quick access to contacts due today",
        "Weekly follow-up count badge",
        "Navigate directly to contact details",
      ],
    },
  ];

  const useCases = [
    {
      icon: Briefcase,
      persona: "Sales Teams",
      description: "Close more deals with complete customer visibility",
      useCases: [
        "Track leads through the pipeline",
        "Log every interaction automatically",
        "Never miss a follow-up call",
        "Research prospects before meetings",
      ],
    },
    {
      icon: Headphones,
      persona: "Support Teams",
      description: "Deliver exceptional customer service",
      useCases: [
        "Manage tickets with full context",
        "Track effort by customer and issue",
        "Send professional status reports",
        "Identify recurring problems",
      ],
    },
    {
      icon: UserCheck,
      persona: "Account Managers",
      description: "Build stronger customer relationships",
      useCases: [
        "360° view of every account",
        "Track all touchpoints in one place",
        "Set smart follow-up reminders",
        "Share insights with your team",
      ],
    },
    {
      icon: Building,
      persona: "Business Owners",
      description: "Get visibility into your customer operations",
      useCases: [
        "Dashboard overview of all accounts",
        "Track team performance metrics",
        "Identify high-effort customers",
        "Make data-driven decisions",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/icon-192x192.png" alt="Opterix 360" className="h-8 w-8" />
            <span className="text-xl font-bold text-foreground">Opterix 360</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/login")}>
              Login
            </Button>
            <Button onClick={() => navigate("/")}>Get Started</Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-primary/5 via-background to-background overflow-hidden">
        <div className="container mx-auto px-4 py-20 lg:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="secondary" className="text-xs">Works Offline</Badge>
              <Badge variant="secondary" className="text-xs">10K+ Contacts</Badge>
              <Badge variant="secondary" className="text-xs">AI-Powered Research</Badge>
            </div>
            <h1 className="text-4xl lg:text-6xl font-bold text-foreground leading-tight">
              Your Complete Customer
              <span className="text-primary block mt-2">Command Center</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Manage contacts, track support tickets, and close deals faster with AI-powered insights.
              Everything you need to deliver exceptional customer experiences — in one app.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" onClick={() => navigate("/")} className="gap-2">
                Start Free <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/install")}>
                Install App
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              No credit card required • Works offline • Free forever plan available
            </p>
          </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <ProblemSolutionSection />

      {/* Core Features Grid */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-lg text-muted-foreground">
              Powerful features designed to help you manage customer relationships and grow your business
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {coreFeatures.map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                description={feature.description}
                benefits={feature.benefits}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Inspirations Spotlight */}
      <InspirationsSpotlight />

      {/* Technical Excellence */}
      <TechnicalExcellence />

      {/* Use Cases Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Built for Every Role
            </h2>
            <p className="text-lg text-muted-foreground">
              Whether you're in sales, support, or management — Opterix 360 adapts to your workflow
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {useCases.map((useCase, index) => (
              <UseCaseCard
                key={index}
                icon={useCase.icon}
                persona={useCase.persona}
                description={useCase.description}
                useCases={useCase.useCases}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary/10 via-background to-accent/5">
        <div className="container mx-auto px-4">
          <Card className="max-w-4xl mx-auto border-primary/20 bg-gradient-to-br from-card to-background shadow-xl">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Ready to Transform Your Customer Relationships?
              </CardTitle>
              <CardDescription className="text-lg">
                Join businesses using Opterix 360 to deliver exceptional customer experiences every day
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" onClick={() => navigate("/")} className="gap-2">
                  Get Started Now <ArrowRight className="h-4 w-4" />
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/login")}>
                  Sign In
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>Secure & Private</span>
                </div>
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-primary" />
                  <span>Works Offline</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <span>Lightning Fast</span>
                </div>
              </div>
              <p className="mt-6 text-xs text-muted-foreground">
                Free forever plan available • No credit card required
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-background py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <img src="/icon-192x192.png" alt="Opterix 360" className="h-6 w-6" />
              <span className="font-semibold text-foreground">Opterix 360</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Opterix 360. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Marketing;
