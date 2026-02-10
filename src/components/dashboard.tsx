"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { usePlatforms, PlatformStatus } from "@/hooks/use-platforms";
import { useComparison, ComparisonResult } from "@/hooks/use-comparison";
import { useLatencyAnalytics } from "@/hooks/use-latency-analytics";
import { useReadiness } from "@/hooks/use-readiness";
import { QueryRunner } from "./query-runner";
import { ComparisonPanel } from "./comparison-panel";
import { CompactConnectionStatus } from "./compact-connection-status";
import { LatencyChart } from "./latency-chart";
import { LatencyStatsRow } from "./latency-stats-row";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { PRESET_QUERIES } from "@/lib/queries";
import { TIME_RANGES, Pill, buildChartData } from "@/lib/latency-constants";

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
    <div className={`text-xs py-1.5 px-3 sm:px-6 border-b ${bgClass}`}>
      {label} &middot; Last refresh: {elapsed}s ago
    </div>
  );
}

export function Dashboard() {
  const {
    platforms,
    configuredPlatforms,
    loading: platformsLoading,
    refresh,
  } = usePlatforms();
  const comparison = useComparison();
  const analyticsState = useLatencyAnalytics();
  const { readiness, refresh: refreshReadiness } = useReadiness();
  const [refreshKey, setRefreshKey] = useState(0);

  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");
  const [activeTab, setActiveTab] = useState("data");
  const [performanceResults, setPerformanceResults] = useState<
    ComparisonResult[]
  >([]);
  const [queryNames, setQueryNames] = useState<string[]>([]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    refresh();
    analyticsState.refresh();
    refreshReadiness();
  }, [refresh, analyticsState, refreshReadiness]);

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
  const fastestId = useMemo(() => {
    const healthyPlatforms = platforms.filter(
      (p) => p.configured && p.health?.ok && p.health.latencyMs,
    );
    if (healthyPlatforms.length === 0) return null;

    const sorted = [...healthyPlatforms].sort(
      (a, b) => a.health!.latencyMs - b.health!.latencyMs,
    );
    return sorted[0].id;
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
      setActiveTab("data");
    }
  };

  const handleCompareSchema = async () => {
    if (!leftId || !rightId) return;
    await comparison.compareSchema(leftId, rightId);
    setActiveTab("schema");
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

  // Hero chart data
  const heroChartData = analyticsState.data
    ? buildChartData(analyticsState.data.snapshots, analyticsState.timeRange)
    : [];
  const heroPlatformIds = analyticsState.data
    ? Object.keys(analyticsState.data.stats)
    : [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-white sticky top-0 z-10 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <HealthBanner platforms={platforms} refreshKey={refreshKey} />
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4">
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

      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
        {/* Compact Connection Status */}
        <CompactConnectionStatus
          platforms={platforms}
          fastestId={fastestId}
          loading={platformsLoading}
        />

        {/* Hero Latency Chart */}
        {analyticsState.loading && !analyticsState.data && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {analyticsState.error && !analyticsState.data && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-3 px-6">
              <p className="text-sm text-red-600">{analyticsState.error}</p>
            </CardContent>
          </Card>
        )}

        {!analyticsState.loading &&
          !analyticsState.error &&
          analyticsState.data &&
          analyticsState.data.count === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Activity className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                No latency data yet
              </p>
              <p className="text-xs text-muted-foreground/60">
                Data will appear after the cron job runs (POST
                /api/cron/latency)
              </p>
            </div>
          )}

        {analyticsState.data && analyticsState.data.count > 0 && (
          <>
            <Card className="bg-white">
              <CardHeader className="py-3 px-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-sm">
                    Latency Over Time (ms)
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {TIME_RANGES.map((tr) => (
                      <Pill
                        key={tr}
                        label={tr}
                        active={analyticsState.timeRange === tr}
                        onClick={() => analyticsState.setTimeRange(tr)}
                      />
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <LatencyChart
                  chartData={heroChartData}
                  platformIds={heroPlatformIds}
                  height={400}
                />
              </CardContent>
            </Card>

            {/* P95 Stats Row */}
            <LatencyStatsRow stats={analyticsState.data.stats} />
          </>
        )}

        {/* Platform Pill Selector */}
        <Card className="bg-white">
          <CardContent className="py-4 px-3 sm:px-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mr-1">
                Compare
              </span>
              {platforms.map((p) => {
                const isLeft = leftId === p.id;
                const isRight = rightId === p.id;
                const isSelected = isLeft || isRight;
                const platformReady = readiness.find(
                  (r) => r.platformId === p.id,
                );
                const notReady =
                  platformReady && !platformReady.ready && p.configured;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={!p.configured}
                    onClick={() => handlePillClick(p.id)}
                    className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border ${
                      isSelected
                        ? "bg-accent-brand text-white border-accent-brand"
                        : p.configured
                          ? "bg-white text-foreground border-border hover:border-accent-brand/50"
                          : "bg-muted text-muted-foreground border-border opacity-50 cursor-not-allowed"
                    }`}
                  >
                    {notReady && (
                      <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-400 border border-white" />
                    )}
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
              <div className="sm:ml-auto">
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

        {/* Readiness Warnings */}
        {readiness
          .filter((r) => {
            const isSelected =
              r.platformId === leftId || r.platformId === rightId;
            return isSelected && !r.ready;
          })
          .map((r) => (
            <Card key={r.platformId} className="border-amber-200 bg-amber-50">
              <CardContent className="py-3 px-6 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-700 font-medium">
                    {r.name} appears empty or not synced
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    {r.tableCount} tables, {r.sampleRowCount} rows in users
                    table. Run{" "}
                    <code className="bg-amber-100 px-1 rounded text-[11px]">
                      npm run db:sync:{r.platformId}
                    </code>{" "}
                    to populate from GCP source.
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}

        {/* Query Runner */}
        <Card className="bg-white">
          <CardHeader className="py-3 px-3 sm:px-6">
            <CardTitle className="text-sm">Query</CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-4">
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
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </main>
    </div>
  );
}
