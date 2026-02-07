"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HealthIndicator } from "./health-indicator";
import { PlatformStatus } from "@/hooks/use-platforms";

interface PlatformSelectorProps {
  label: string;
  platforms: PlatformStatus[];
  value: string;
  onChange: (value: string) => void;
}

export function PlatformSelector({
  label,
  platforms,
  value,
  onChange,
}: PlatformSelectorProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select platform" />
        </SelectTrigger>
        <SelectContent>
          {platforms.map((p) => (
            <SelectItem key={p.id} value={p.id} disabled={!p.configured}>
              <span className="flex items-center gap-2">
                <HealthIndicator
                  status={
                    !p.configured
                      ? "unconfigured"
                      : p.health?.ok
                        ? "healthy"
                        : "unhealthy"
                  }
                />
                {p.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
