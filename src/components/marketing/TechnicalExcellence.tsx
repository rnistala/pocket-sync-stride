import { Smartphone, Wifi, WifiOff, Cloud, Moon, Zap } from "lucide-react";

const features = [
  {
    icon: Smartphone,
    title: "Progressive Web App",
    description: "Install on any device - phone, tablet, or desktop. No app store required.",
  },
  {
    icon: WifiOff,
    title: "Works Offline",
    description: "Full functionality without internet. Your data syncs when you're back online.",
  },
  {
    icon: Cloud,
    title: "Cloud Sync",
    description: "Seamless synchronization across all your devices in real-time.",
  },
  {
    icon: Moon,
    title: "Dark Mode",
    description: "Easy on the eyes, day or night. Automatically adapts to your preference.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Optimized performance even with thousands of contacts and tickets.",
  },
];

const TechnicalExcellence = () => {
  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Built for Performance
          </h2>
          <p className="text-lg text-muted-foreground">
            Enterprise-grade technology that works the way you do
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 max-w-5xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="flex flex-col items-center text-center p-6 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2 text-sm">{feature.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TechnicalExcellence;
