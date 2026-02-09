import { cn } from "@/lib/utils";

interface HealthIndicatorProps {
  status: "healthy" | "unhealthy" | "unconfigured" | "loading";
  className?: string;
}

export function HealthIndicator({ status, className }: HealthIndicatorProps) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        status === "healthy" && "bg-green-500",
        status === "unhealthy" && "bg-red-500",
        status === "unconfigured" && "bg-gray-300",
        status === "loading" && "bg-yellow-400 animate-pulse",
        className,
      )}
      style={
        status === "healthy"
          ? { animation: "pulse-dot 2s ease-in-out infinite" }
          : undefined
      }
    />
  );
}
