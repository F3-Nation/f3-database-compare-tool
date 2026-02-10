"use client";

import type { TimeRange, LatencySnapshot } from "@/hooks/use-latency-analytics";

export const PLATFORM_COLORS: Record<string, string> = {
  gcp: "#222222",
  local: "#6366f1",
  neon: "#10b981",
  supabase: "#f59e0b",
};

export const PLATFORM_LABELS: Record<string, string> = {
  gcp: "GCP",
  local: "Local",
  neon: "Neon",
  supabase: "Supabase",
};

export const TIME_RANGES: TimeRange[] = ["1h", "24h", "7d", "30d"];
export const ENVIRONMENTS = ["all", "local", "firebase"] as const;
export const PLATFORMS = ["all", "gcp", "local", "neon", "supabase"] as const;

export function formatTime(dateStr: string, timeRange: TimeRange): string {
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

export function buildChartData(
  snapshots: LatencySnapshot[],
  timeRange: TimeRange,
) {
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

export function Pill({
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
