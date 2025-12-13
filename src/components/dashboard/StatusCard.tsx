import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatusCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}

const variantStyles = {
  default: "bg-card",
  success: "bg-accent",
  warning: "bg-warning/10",
  danger: "bg-destructive/10",
};

const iconStyles = {
  default: "bg-secondary text-secondary-foreground",
  success: "bg-primary/10 text-primary",
  warning: "bg-warning/20 text-warning",
  danger: "bg-destructive/20 text-destructive",
};

export function StatusCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  className,
}: StatusCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl p-5 shadow-card border border-border/50 animate-fade-in",
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={cn("p-3 rounded-lg", iconStyles[variant])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
