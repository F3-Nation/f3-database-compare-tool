"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { LatencyAnalyticsState } from "@/hooks/use-latency-analytics";
import { Activity, Loader2 } from "lucide-react";
import {
  PLATFORM_LABELS,
  TIME_RANGES,
  ENVIRONMENTS,
  PLATFORMS,
  Pill,
  buildChartData,
} from "@/lib/latency-constants";
import { LatencyChart } from "./latency-chart";
import { LatencyStatsRow } from "./latency-stats-row";

interface LatencyAnalyticsProps {
  analyticsState: LatencyAnalyticsState;
}

export function LatencyAnalytics({ analyticsState }: LatencyAnalyticsProps) {
  const {
    timeRange,
    setTimeRange,
    environment,
    setEnvironment,
    platformFilter,
    setPlatformFilter,
    data,
    loading,
    error,
  } = analyticsState;

  const chartData = data ? buildChartData(data.snapshots, timeRange) : [];
  const platformIds = data ? Object.keys(data.stats) : [];

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <Card className="bg-white">
        <CardContent className="py-4 px-6">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Time
              </span>
              {TIME_RANGES.map((tr) => (
                <Pill
                  key={tr}
                  label={tr}
                  active={timeRange === tr}
                  onClick={() => setTimeRange(tr)}
                />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Env
              </span>
              {ENVIRONMENTS.map((env) => (
                <Pill
                  key={env}
                  label={
                    env === "all"
                      ? "All"
                      : env === "local"
                        ? "Local"
                        : "Firebase"
                  }
                  active={environment === env}
                  onClick={() => setEnvironment(env)}
                />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Platform
              </span>
              {PLATFORMS.map((p) => (
                <Pill
                  key={p}
                  label={p === "all" ? "All" : PLATFORM_LABELS[p] || p}
                  active={platformFilter === p}
                  onClick={() => setPlatformFilter(p)}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3 px-6">
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && data && data.count === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Activity className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">No latency data yet</p>
          <p className="text-xs text-muted-foreground/60">
            Data will appear after the cron job runs (POST /api/cron/latency)
          </p>
        </div>
      )}

      {/* Stats + Chart */}
      {!loading && data && data.count > 0 && (
        <>
          <LatencyStatsRow stats={data.stats} />

          <Card className="bg-white">
            <CardContent className="px-4 py-3">
              <LatencyChart
                chartData={chartData}
                platformIds={platformIds}
                height={350}
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
