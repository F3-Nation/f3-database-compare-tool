"use client";

import { useState, useEffect, useCallback } from "react";

export type TimeRange = "1h" | "24h" | "7d" | "30d";
export type EnvironmentFilter = "all" | "local" | "firebase";

export interface LatencySnapshot {
  id: number;
  platformId: string;
  environment: string;
  latencyMs: number;
  ok: boolean;
  error: string | null;
  version: string | null;
  createdAt: string;
}

export interface PlatformStats {
  avg: number;
  min: number;
  max: number;
  p95: number;
  count: number;
}

export interface AnalyticsResponse {
  timeRange: string;
  environment: string;
  platformId: string;
  count: number;
  stats: Record<string, PlatformStats>;
  snapshots: LatencySnapshot[];
}

export function useLatencyAnalytics() {
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  const [environment, setEnvironment] = useState<EnvironmentFilter>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ timeRange, environment });
      if (platformFilter !== "all") {
        params.set("platformId", platformFilter);
      }
      const res = await fetch(`/api/analytics/latency?${params}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to fetch analytics");
        return;
      }
      setData(json);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch analytics",
      );
    } finally {
      setLoading(false);
    }
  }, [timeRange, environment, platformFilter]);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  return {
    timeRange,
    setTimeRange,
    environment,
    setEnvironment,
    platformFilter,
    setPlatformFilter,
    data,
    loading,
    error,
    refresh: fetch_,
  };
}
