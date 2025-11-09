import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  Users,
  MessageSquare,
  Calendar,
  Search,
  TrendingUp,
  Ticket,
  Smartphone,
  Zap,
  Shield,
  Clock,
  BarChart3,
  Cloud,
} from "lucide-react";

const Marketing = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Users,
      title: "Contact Management",
      description: "Complete 360° view of customer interactions, orders, and communication history",
    },
    {
      icon: MessageSquare,
      title: "Interaction Tracking",
      description: "Log calls, emails, meetings with timestamps and detailed notes",
    },
    {
      icon: Ticket,
      title: "Ticket Management",
      description: "Track and resolve customer issues with priority-based workflows",
    },
    {
      icon: Calendar,
      title: "Follow-Up Reminders",
      description: "Never miss important follow-ups with smart reminder system",
    },
    {
      icon: TrendingUp,
      title: "Sales Orders",
      description: "Track orders with detailed value, status, and timeline management",
    },
    {
      icon: Search,
      title: "Advanced Search",
      description: "Find contacts instantly with powerful filtering and search capabilities",
    },
    {
      icon: BarChart3,
      title: "Real-time Metrics",
      description: "Dashboard with key metrics and performance indicators",
    },
    {
      icon: Smartphone,
      title: "Progressive Web App",
      description: "Install on any device - works offline with automatic sync",
    },
    {
      icon: Cloud,
      title: "Cloud Sync",
      description: "Automatic synchronization across all your devices",
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Enterprise-grade security for your customer data",
    },
    {
      icon: Clock,
      title: "Offline Mode",
      description: "Work seamlessly even without internet connection",
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Optimized performance for quick access to customer information",
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
      <section className="bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="container mx-auto px-4 py-20 lg:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <Badge variant="secondary" className="mb-4">
              CRM & Customer Support Platform
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold text-foreground leading-tight">
              Complete Customer Visibility
              <span className="text-primary block mt-2">in One Platform</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Opterix 360 gives you a complete 360° view of your customers. Track interactions,
              manage tickets, and close deals faster with our all-in-one CRM solution.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button size="lg" onClick={() => navigate("/")}>
                Start Free Trial
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

      {/* Features Grid */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-lg text-muted-foreground">
              Powerful features designed to help you manage customer relationships and grow your
              business
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="border-border hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-foreground">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary/5">
        <div className="container mx-auto px-4">
          <Card className="max-w-4xl mx-auto border-primary/20 bg-gradient-to-br from-primary/5 to-background">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Ready to Transform Your Customer Relationships?
              </CardTitle>
              <CardDescription className="text-lg">
                Join thousands of businesses using Opterix 360 to deliver exceptional customer
                experiences
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" onClick={() => navigate("/")}>
                  Get Started Now
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/login")}>
                  Sign In
                </Button>
              </div>
              <div className="mt-8 flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span>Secure & Private</span>
                </div>
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4" />
                  <span>Works Offline</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  <span>Lightning Fast</span>
                </div>
              </div>
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
              © 2024 Opterix 360. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Marketing;
