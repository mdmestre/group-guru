import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface StepperProps {
  steps: Array<{ label: string; description?: string }>;
  currentStep: number;
  className?: string;
}

export function Stepper({ steps, currentStep, className }: StepperProps) {
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isUpcoming = stepNumber > currentStep;

          return (
            <React.Fragment key={stepNumber}>
              <div className="flex flex-col items-center flex-1">
                <div className="flex items-center w-full">
                  {/* Step Circle */}
                  <div className="relative flex flex-col items-center">
                    <div
                      className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300",
                        isCompleted &&
                          "bg-primary border-primary text-primary-foreground shadow-sm",
                        isCurrent &&
                          "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110",
                        isUpcoming &&
                          "bg-background border-border text-muted-foreground"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <span className="text-sm font-semibold">{stepNumber}</span>
                      )}
                    </div>
                    {/* Step Label */}
                    <div className="mt-3 text-center max-w-[120px]">
                      <div
                        className={cn(
                          "text-sm font-semibold transition-colors duration-200",
                          isCompleted || isCurrent
                            ? "text-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {step.label}
                      </div>
                      {step.description && (
                        <div
                          className={cn(
                            "text-xs mt-0.5 transition-colors duration-200",
                            isCompleted || isCurrent
                              ? "text-muted-foreground"
                              : "text-muted-foreground/60"
                          )}
                        >
                          {step.description}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div
                      className={cn(
                        "flex-1 h-0.5 mx-2 -mt-5 transition-colors duration-300",
                        isCompleted ? "bg-primary" : "bg-border"
                      )}
                    />
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

