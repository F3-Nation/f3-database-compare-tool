"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useLatencyAnalytics,
  type TimeRange,
  type EnvironmentFilter,
  type LatencySnapshot,
} from "@/hooks/use-latency-analytics";
import { Activity, Loader2 } from "lucide-react";

const PLATFORM_COLORS: Record<string, string> = {
  gcp: "#222222",
  local: "#6366f1",
  neon: "#10b981",
  supabase: "#f59e0b",
};

const PLATFORM_LABELS: Record<string, string> = {
  gcp: "GCP",
  local: "Local",
  neon: "Neon",
  supabase: "Supabase",
};

const TIME_RANGES: TimeRange[] = ["1h", "24h", "7d", "30d"];
const ENVIRONMENTS: EnvironmentFilter[] = ["all", "local", "firebase"];
const PLATFORMS = ["all", "gcp", "local", "neon", "supabase"];

function Pill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border ${
        active
          ? "bg-accent-brand text-white border-accent-brand"
          : "bg-white text-foreground border-border hover:border-accent-brand/50"
      }`}
    >
      {label}
    </button>
  );
}

function formatTime(dateStr: string, timeRange: TimeRange): string {
  const d = new Date(dateStr);
  if (timeRange === "1h" || timeRange === "24h") {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildChartData(snapshots: LatencySnapshot[], timeRange: TimeRange) {
  const byTime = new Map<string, Record<string, number>>();
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  for (const snap of sorted) {
    const key = snap.createdAt;
    const existing = byTime.get(key) || {};
    existing[snap.platformId] = snap.latencyMs;
    byTime.set(key, existing);
  }

  return Array.from(byTime.entries()).map(([time, values]) => ({
    time: formatTime(time, timeRange),
    rawTime: time,
    ...values,
  }));
}

export function LatencyAnalytics() {
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
  } = useLatencyAnalytics();

  const chartData = data ? buildChartData(data.snapshots, timeRange) : [];
  const platformIds = data ? Object.keys(data.stats) : [];

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <Card className="bg-white">
        <CardContent className="py-4 px-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
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
            <div className="flex items-center gap-2">
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
            <div className="flex items-center gap-2">
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

      {/* Stats Cards */}
      {!loading && data && data.count > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {platformIds.map((pid) => {
              const s = data.stats[pid];
              return (
                <Card key={pid} className="bg-white">
                  <CardHeader className="py-3 px-5">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{
                          backgroundColor: PLATFORM_COLORS[pid] || "#888",
                        }}
                      />
                      <CardTitle className="text-sm">
                        {PLATFORM_LABELS[pid] || pid}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="px-5 pb-4">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Avg</span>
                        <p className="text-base font-semibold">{s.avg}ms</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">P95</span>
                        <p className="text-base font-semibold">{s.p95}ms</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Min</span>
                        <p className="font-medium">{s.min}ms</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Max</span>
                        <p className="font-medium">{s.max}ms</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      {s.count} samples
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Chart */}
          <Card className="bg-white">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-sm">Latency Over Time (ms)</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    unit="ms"
                  />
                  <Tooltip />
                  <Legend />
                  {platformIds.map((pid) => (
                    <Line
                      key={pid}
                      type="monotone"
                      dataKey={pid}
                      name={PLATFORM_LABELS[pid] || pid}
                      stroke={PLATFORM_COLORS[pid] || "#888"}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
