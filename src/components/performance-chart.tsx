"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComparisonResult } from "@/hooks/use-comparison";

interface PerformanceChartProps {
  results: ComparisonResult[];
  queryNames: string[];
}

export function PerformanceChart({
  results,
  queryNames,
}: PerformanceChartProps) {
  if (results.length === 0) return null;

  const latestResult = results[results.length - 1];
  const leftName = latestResult.left.name;
  const rightName = latestResult.right.name;

  const data = results.map((r, i) => ({
    query: queryNames[i] || `Query ${i + 1}`,
    [leftName]: Math.round(r.left.latencyMs),
    [rightName]: Math.round(r.right.latencyMs),
  }));

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm">Query Latency Comparison (ms)</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
            <XAxis
              dataKey="query"
              tick={{ fontSize: 12 }}
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
            <Bar dataKey={leftName} fill="#222222" radius={[4, 4, 0, 0]} />
            <Bar dataKey={rightName} fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
