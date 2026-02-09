"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { usePlatforms, PlatformStatus } from "@/hooks/use-platforms";
import { useComparison, ComparisonResult } from "@/hooks/use-comparison";
import { QueryRunner } from "./query-runner";
import { ComparisonPanel } from "./comparison-panel";
import { HealthIndicator } from "./health-indicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMs } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import { PRESET_QUERIES } from "@/lib/queries";

function useTickingCounter(resetKey: number) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let ticks = 0;
    const interval = setInterval(() => {
      if (!cancelled) {
        ticks += 1;
        setCount(ticks);
      }
    }, 1000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [resetKey]);

  // Reset to 0 synchronously when resetKey changes (render-time derivation)
  const [prevKey, setPrevKey] = useState(resetKey);
  if (prevKey !== resetKey) {
    setPrevKey(resetKey);
    setCount(0);
  }

  return count;
}

function HealthBanner({
  platforms,
  refreshKey,
}: {
  platforms: PlatformStatus[];
  refreshKey: number;
}) {
  const elapsed = useTickingCounter(refreshKey);
  const configured = platforms.filter((p) => p.configured);
  const healthy = configured.filter((p) => p.health?.ok);

  let status: "all" | "partial" | "none";
  let label: string;
  if (configured.length === 0) {
    status = "none";
    label = "No platforms configured";
  } else if (healthy.length === configured.length) {
    status = "all";
    label = "All Systems Operational";
  } else if (healthy.length > 0) {
    status = "partial";
    label = `${healthy.length}/${configured.length} Systems Operational`;
  } else {
    status = "none";
    label = "All Systems Down";
  }

  const bgClass =
    status === "all"
      ? "bg-emerald-50 text-emerald-700 border-emerald-100"
      : status === "partial"
        ? "bg-amber-50 text-amber-700 border-amber-100"
        : "bg-red-50 text-red-700 border-red-100";

  return (
    <div className={`text-xs py-1.5 px-6 border-b ${bgClass}`}>
      {label} &middot; Last refresh: {elapsed}s ago
    </div>
  );
}

function latencyColor(ms: number): string {
  if (ms < 150) return "text-green-600";
  if (ms < 300) return "text-amber-600";
  return "text-red-600";
}

export function Dashboard() {
  const {
    platforms,
    configuredPlatforms,
    loading: platformsLoading,
    refresh,
  } = usePlatforms();
  const comparison = useComparison();
  const [refreshKey, setRefreshKey] = useState(0);

  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");
  const [performanceResults, setPerformanceResults] = useState<
    ComparisonResult[]
  >([]);
  const [queryNames, setQueryNames] = useState<string[]>([]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    refresh();
  }, [refresh]);

  // Auto-select first two configured platforms (render-time, matching original pattern)
  const handlePlatformsReady = useCallback(() => {
    if (configuredPlatforms.length >= 2 && !leftId && !rightId) {
      setLeftId(configuredPlatforms[0].id);
      setRightId(configuredPlatforms[1].id);
    }
  }, [configuredPlatforms, leftId, rightId]);

  if (!platformsLoading && configuredPlatforms.length >= 2 && !leftId) {
    handlePlatformsReady();
  }

  // Compute fastest platform
  const { fastestId, relativeLatency } = useMemo(() => {
    const healthyPlatforms = platforms.filter(
      (p) => p.configured && p.health?.ok && p.health.latencyMs,
    );
    if (healthyPlatforms.length === 0)
      return { fastestId: null, relativeLatency: {} as Record<string, number> };

    const sorted = [...healthyPlatforms].sort(
      (a, b) => a.health!.latencyMs - b.health!.latencyMs,
    );
    const fastest = sorted[0];
    const rl: Record<string, number> = {};
    for (const p of healthyPlatforms) {
      if (p.id !== fastest.id) {
        rl[p.id] =
          Math.round((p.health!.latencyMs / fastest.health!.latencyMs) * 10) /
          10;
      }
    }
    return { fastestId: fastest.id, relativeLatency: rl };
  }, [platforms]);

  const handleRunQuery = async (sql: string) => {
    if (!leftId || !rightId) return;
    const result = await comparison.compareData(leftId, rightId, sql);

    if (result) {
      setPerformanceResults((prev) => [...prev, result]);
      const matchingPreset = PRESET_QUERIES.find((q) => q.sql === sql);
      setQueryNames((prev) => [
        ...prev,
        matchingPreset?.name || "Custom Query",
      ]);
    }
  };

  const handleCompareSchema = async () => {
    if (!leftId || !rightId) return;
    await comparison.compareSchema(leftId, rightId);
  };

  // Pill selector: tap to toggle selection
  const handlePillClick = (platformId: string) => {
    if (leftId === platformId) {
      setLeftId("");
    } else if (rightId === platformId) {
      setRightId("");
    } else if (!leftId) {
      setLeftId(platformId);
    } else if (!rightId) {
      setRightId(platformId);
    } else {
      // Both selected: replace right
      setRightId(platformId);
    }
  };

  const bothSelected = !!leftId && !!rightId;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white sticky top-0 z-10 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <HealthBanner platforms={platforms} refreshKey={refreshKey} />
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                F3 Database Compare
              </h1>
              <p className="text-sm text-muted-foreground font-light">
                Side-by-side PostgreSQL platform comparison
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={platformsLoading}
              className="gap-1.5 transition-all duration-200"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${platformsLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-10">
        {/* Platform Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {platforms.map((p) => (
            <Card
              key={p.id}
              className="bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.05)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.1),0_8px_16px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 transition-all duration-200"
            >
              <CardHeader className="py-4 px-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{p.name}</CardTitle>
                  <HealthIndicator
                    status={
                      platformsLoading
                        ? "loading"
                        : !p.configured
                          ? "unconfigured"
                          : p.health?.ok
                            ? "healthy"
                            : "unhealthy"
                    }
                  />
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-4">
                {!p.configured ? (
                  <p className="text-xs text-muted-foreground">
                    Not configured
                  </p>
                ) : p.health?.ok ? (
                  <div className="space-y-1.5">
                    <Badge variant="success" className="text-[10px]">
                      Connected
                    </Badge>
                    <p
                      className={`text-lg font-semibold ${latencyColor(p.health.latencyMs)}`}
                    >
                      {formatMs(p.health.latencyMs)}
                    </p>
                    {fastestId === p.id ? (
                      <Badge className="bg-accent-brand text-white text-[10px]">
                        Fastest
                      </Badge>
                    ) : relativeLatency[p.id] ? (
                      <span className="text-[10px] text-muted-foreground">
                        {relativeLatency[p.id]}x slower
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-1">
                    <Badge variant="destructive" className="text-[10px]">
                      Error
                    </Badge>
                    <p className="text-xs text-red-600 truncate">
                      {p.health?.error}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Platform Pill Selector */}
        <Card className="bg-white">
          <CardContent className="py-4 px-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mr-1">
                Compare
              </span>
              {platforms.map((p) => {
                const isLeft = leftId === p.id;
                const isRight = rightId === p.id;
                const isSelected = isLeft || isRight;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={!p.configured}
                    onClick={() => handlePillClick(p.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border ${
                      isSelected
                        ? "bg-accent-brand text-white border-accent-brand"
                        : p.configured
                          ? "bg-white text-foreground border-border hover:border-accent-brand/50"
                          : "bg-muted text-muted-foreground border-border opacity-50 cursor-not-allowed"
                    }`}
                  >
                    {isLeft && (
                      <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-white/20 text-[10px] font-bold">
                        L
                      </span>
                    )}
                    {isRight && (
                      <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-white/20 text-[10px] font-bold">
                        R
                      </span>
                    )}
                    {p.name}
                  </button>
                );
              })}
              <div className="ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCompareSchema}
                  disabled={!bothSelected || comparison.loading}
                  className="border-accent-brand/30 text-accent-brand hover:bg-accent-brand hover:text-white transition-all duration-200"
                >
                  Compare Schemas
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Query Runner */}
        <Card className="bg-white">
          <CardHeader className="py-3 px-6">
            <CardTitle className="text-sm">Query</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-4">
            <QueryRunner
              onRun={handleRunQuery}
              loading={comparison.loading}
              disabled={!bothSelected}
            />
          </CardContent>
        </Card>

        {/* Error Display */}
        {comparison.error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-3 px-6">
              <p className="text-sm text-red-600">{comparison.error}</p>
            </CardContent>
          </Card>
        )}

        {/* Comparison Results */}
        <ComparisonPanel
          schemaResult={comparison.schemaResult}
          dataResult={comparison.dataResult}
          performanceResults={performanceResults}
          queryNames={queryNames}
        />
      </main>
    </div>
  );
}
