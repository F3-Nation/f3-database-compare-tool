"use client";

import { useState, useCallback } from "react";
import { usePlatforms } from "@/hooks/use-platforms";
import { useComparison, ComparisonResult } from "@/hooks/use-comparison";
import { PlatformSelector } from "./platform-selector";
import { QueryRunner } from "./query-runner";
import { ComparisonPanel } from "./comparison-panel";
import { HealthIndicator } from "./health-indicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMs } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import { PRESET_QUERIES } from "@/lib/queries";

export function Dashboard() {
  const {
    platforms,
    configuredPlatforms,
    loading: platformsLoading,
    refresh,
  } = usePlatforms();
  const comparison = useComparison();

  const [leftId, setLeftId] = useState("");
  const [rightId, setRightId] = useState("");
  const [performanceResults, setPerformanceResults] = useState<
    ComparisonResult[]
  >([]);
  const [queryNames, setQueryNames] = useState<string[]>([]);

  // Auto-select first two configured platforms
  const handlePlatformsReady = useCallback(() => {
    if (configuredPlatforms.length >= 2 && !leftId && !rightId) {
      setLeftId(configuredPlatforms[0].id);
      setRightId(configuredPlatforms[1].id);
    }
  }, [configuredPlatforms, leftId, rightId]);

  // Trigger auto-select when platforms load
  if (!platformsLoading && configuredPlatforms.length >= 2 && !leftId) {
    handlePlatformsReady();
  }

  const handleRunQuery = async (sql: string) => {
    if (!leftId || !rightId) return;
    await comparison.compareData(leftId, rightId, sql);

    // Track for performance chart
    if (comparison.dataResult) {
      setPerformanceResults((prev) => [...prev, comparison.dataResult!]);
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

  const bothSelected = !!leftId && !!rightId;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                F3 Database Compare
              </h1>
              <p className="text-sm text-muted-foreground">
                Side-by-side PostgreSQL platform comparison
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={platformsLoading}
              className="gap-1.5"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${platformsLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Platform Status Cards */}
        <div className="grid grid-cols-4 gap-4">
          {platforms.map((p) => (
            <Card key={p.id}>
              <CardHeader className="py-3 px-4">
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
              <CardContent className="px-4 pb-3">
                {!p.configured ? (
                  <p className="text-xs text-muted-foreground">
                    Not configured
                  </p>
                ) : p.health?.ok ? (
                  <div className="space-y-1">
                    <Badge variant="success" className="text-[10px]">
                      Connected
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {formatMs(p.health.latencyMs)}
                    </p>
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

        {/* Platform Selectors */}
        <Card>
          <CardContent className="py-4 px-6">
            <div className="flex items-end gap-8">
              <PlatformSelector
                label="Left Platform"
                platforms={platforms}
                value={leftId}
                onChange={setLeftId}
              />
              <div className="text-muted-foreground text-lg font-light pb-2">
                vs
              </div>
              <PlatformSelector
                label="Right Platform"
                platforms={platforms}
                value={rightId}
                onChange={setRightId}
              />
              <div className="ml-auto pb-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCompareSchema}
                  disabled={!bothSelected || comparison.loading}
                >
                  Compare Schemas
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Query Runner */}
        <Card>
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
