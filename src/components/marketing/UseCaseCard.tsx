import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface UseCaseCardProps {
  icon: LucideIcon;
  persona: string;
  description: string;
  useCases: string[];
}

const UseCaseCard = ({ icon: Icon, persona, description, useCases }: UseCaseCardProps) => {
  return (
    <Card className="border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg h-full bg-gradient-to-br from-card to-muted/30">
      <CardHeader className="pb-3">
        <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Icon className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="text-foreground text-xl">{persona}</CardTitle>
        <p className="text-muted-foreground text-sm mt-1">{description}</p>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {useCases.map((useCase, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <span className="text-primary font-medium">✓</span>
              <span className="text-foreground/80">{useCase}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default UseCaseCard;
