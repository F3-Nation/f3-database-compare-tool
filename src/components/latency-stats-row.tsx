"use client";

import { Card, CardContent } from "@/components/ui/card";
import { PLATFORM_COLORS, PLATFORM_LABELS } from "@/lib/latency-constants";
import type { PlatformStats } from "@/hooks/use-latency-analytics";

interface LatencyStatsRowProps {
  stats: Record<string, PlatformStats>;
}

export function LatencyStatsRow({ stats }: LatencyStatsRowProps) {
  const entries = Object.entries(stats).sort(([, a], [, b]) => a.p95 - b.p95);

  if (entries.length === 0) return null;

  const bestP95Id = entries[0][0];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {entries.map(([pid, s]) => (
        <Card
          key={pid}
          className={`bg-white ${pid === bestP95Id ? "border-l-2 border-l-green-500" : ""}`}
        >
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-1.5 mb-2">
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: PLATFORM_COLORS[pid] || "#888" }}
              />
              <span className="text-xs font-medium">
                {PLATFORM_LABELS[pid] || pid}
              </span>
            </div>
            <p className="text-2xl font-bold">{s.p95}ms</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              P95
            </p>
            <p className="text-sm text-muted-foreground mt-1">Avg {s.avg}ms</p>
            <p className="text-xs text-muted-foreground">
              Min {s.min}ms &middot; Max {s.max}ms
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {s.count} samples
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
