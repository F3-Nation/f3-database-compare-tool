"use client";

import { Card, CardContent } from "@/components/ui/card";
import { HealthIndicator } from "./health-indicator";
import { formatMs, latencyColor } from "@/lib/utils";
import { Zap } from "lucide-react";
import type { PlatformStatus } from "@/hooks/use-platforms";

interface CompactConnectionStatusProps {
  platforms: PlatformStatus[];
  fastestId: string | null;
  loading: boolean;
}

export function CompactConnectionStatus({
  platforms,
  fastestId,
  loading,
}: CompactConnectionStatusProps) {
  return (
    <Card className="bg-white">
      <CardContent className="py-2.5 px-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {platforms.map((p, i) => (
            <div key={p.id} className="flex items-center gap-x-4">
              {i > 0 && <span className="hidden sm:inline text-border">|</span>}
              <div className="flex items-center gap-1.5">
                <HealthIndicator
                  status={
                    loading
                      ? "loading"
                      : !p.configured
                        ? "unconfigured"
                        : p.health?.ok
                          ? "healthy"
                          : "unhealthy"
                  }
                />
                <span className="text-sm font-medium">{p.name}</span>
                {!p.configured ? (
                  <span className="text-xs text-muted-foreground">N/A</span>
                ) : p.health?.ok ? (
                  <>
                    <span
                      className={`text-sm font-semibold ${latencyColor(p.health.latencyMs)}`}
                    >
                      {formatMs(p.health.latencyMs)}
                    </span>
                    {fastestId === p.id && (
                      <Zap className="h-3.5 w-3.5 text-green-500 fill-green-500" />
                    )}
                  </>
                ) : (
                  <span className="text-xs text-red-600">Error</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
