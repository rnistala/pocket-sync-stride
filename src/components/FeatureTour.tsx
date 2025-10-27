import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface TourStep {
  target: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
}

interface FeatureTourProps {
  steps: TourStep[];
  onComplete: () => void;
  onSkip: () => void;
}

export const FeatureTour = ({ steps, onComplete, onSkip }: FeatureTourProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const currentStepData = steps[currentStep];

  useEffect(() => {
    const updateTargetPosition = () => {
      const element = document.querySelector(currentStepData.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };

    updateTargetPosition();
    window.addEventListener("resize", updateTargetPosition);
    window.addEventListener("scroll", updateTargetPosition);

    return () => {
      window.removeEventListener("resize", updateTargetPosition);
      window.removeEventListener("scroll", updateTargetPosition);
    };
  }, [currentStep, currentStepData.target]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getTooltipPosition = () => {
    if (!targetRect) return { top: "50%", left: "50%" };

    const position = currentStepData.position || "bottom";
    const padding = 20;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = 320; // w-80 = 20rem = 320px
    const isMobile = viewportWidth < 640;

    // Calculate initial position
    let style: any = {};
    
    switch (position) {
      case "top":
        style = {
          top: `${Math.max(padding, targetRect.top - padding)}px`,
          left: `${targetRect.left + targetRect.width / 2}px`,
          transform: "translate(-50%, -100%)",
        };
        break;
      case "bottom":
        style = {
          top: `${targetRect.bottom + padding}px`,
          left: `${targetRect.left + targetRect.width / 2}px`,
          transform: "translate(-50%, 0)",
        };
        break;
      case "left":
        style = {
          top: `${targetRect.top + targetRect.height / 2}px`,
          left: `${Math.max(padding, targetRect.left - padding)}px`,
          transform: "translate(-100%, -50%)",
        };
        break;
      case "right":
        style = {
          top: `${targetRect.top + targetRect.height / 2}px`,
          left: `${Math.min(viewportWidth - tooltipWidth - padding, targetRect.right + padding)}px`,
          transform: "translate(0, -50%)",
        };
        break;
      default:
        style = {
          top: `${targetRect.bottom + padding}px`,
          left: `${targetRect.left + targetRect.width / 2}px`,
          transform: "translate(-50%, 0)",
        };
    }

    // Adjust for mobile to keep tooltip within viewport
    if (isMobile) {
      // Center horizontally on mobile with padding
      style.left = "50%";
      style.transform = "translate(-50%, 0)";
      style.maxWidth = `calc(100vw - ${padding * 2}px)`;
      
      // Position below target on mobile, but ensure it's visible
      const topPosition = targetRect.bottom + padding;
      if (topPosition + 300 > viewportHeight) {
        // If tooltip would go off bottom, position it above
        style.top = `${Math.max(padding, targetRect.top - 200)}px`;
      } else {
        style.top = `${topPosition}px`;
      }
    }

    return style;
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[9998] bg-black/30 dark:bg-black/50 animate-fade-in overflow-hidden">
        {/* Spotlight */}
        {targetRect && (
          <div
            className="absolute border-4 border-primary rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.3)] dark:shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] animate-scale-in pointer-events-none"
            style={{
              top: `${targetRect.top - 8}px`,
              left: `${targetRect.left - 8}px`,
              width: `${targetRect.width + 16}px`,
              height: `${targetRect.height + 16}px`,
            }}
          />
        )}
      </div>

      {/* Tooltip */}
      <Card
        ref={tooltipRef}
        className="fixed z-[9999] w-80 max-w-[calc(100vw-2rem)] shadow-xl animate-scale-in mx-4 sm:mx-0"
        style={getTooltipPosition()}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg">{currentStepData.title}</CardTitle>
              <CardDescription className="mt-1 text-xs">
                Step {currentStep + 1} of {steps.length}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={onSkip}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {currentStepData.description}
          </p>
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <div className="flex gap-1">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    index === currentStep ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <Button size="sm" onClick={handleNext}>
              {currentStep === steps.length - 1 ? "Finish" : "Next"}
              {currentStep !== steps.length - 1 && (
                <ChevronRight className="h-4 w-4 ml-1" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
};
