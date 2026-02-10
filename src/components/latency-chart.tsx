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
import { PLATFORM_COLORS, PLATFORM_LABELS } from "@/lib/latency-constants";

interface LatencyChartProps {
  chartData: Record<string, unknown>[];
  platformIds: string[];
  height?: number;
}

export function LatencyChart({
  chartData,
  platformIds,
  height = 400,
}: LatencyChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
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
  );
}
