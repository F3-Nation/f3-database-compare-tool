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
import { Badge } from "@/components/ui/badge";
import { ComparisonResult } from "@/hooks/use-comparison";
import { AlertTriangle } from "lucide-react";

interface PerformanceChartProps {
  results: ComparisonResult[];
  queryNames: string[];
}

interface ChartDataEntry {
  query: string;
  [key: string]: string | number;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: ChartDataEntry }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white border border-border rounded-md shadow-sm p-2 text-xs">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry) => {
        const rowCountKey = `${entry.name} rows`;
        const rowCount = entry.payload[rowCountKey];
        return (
          <div key={entry.name} className="flex items-center gap-2">
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-mono">{entry.value}ms</span>
            {rowCount !== undefined && (
              <span className="text-muted-foreground">({rowCount} rows)</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function PerformanceChart({
  results,
  queryNames,
}: PerformanceChartProps) {
  if (results.length === 0) return null;

  const latestResult = results[results.length - 1];
  const leftName = latestResult.left.name;
  const rightName = latestResult.right.name;

  const hasEmptyPlatform = results.some(
    (r) => r.left.rowCount === 0 || r.right.rowCount === 0,
  );
  const hasRowCountMismatch = results.some(
    (r) => r.left.rowCount !== r.right.rowCount,
  );

  const data: ChartDataEntry[] = results.map((r, i) => ({
    query: queryNames[i] || `Query ${i + 1}`,
    [leftName]: Math.round(r.left.latencyMs),
    [rightName]: Math.round(r.right.latencyMs),
    [`${leftName} rows`]: r.left.rowCount,
    [`${rightName} rows`]: r.right.rowCount,
  }));

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm">Query Latency Comparison (ms)</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-3">
        {hasEmptyPlatform && (
          <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-700">
              Latency results may be misleading — one platform returned 0 rows.
              Empty databases respond faster because there is no data to scan.
            </p>
          </div>
        )}
        {!hasEmptyPlatform && hasRowCountMismatch && (
          <div className="flex items-center gap-2 rounded-md bg-amber-50/60 border border-amber-100 px-3 py-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-600">
              Row counts differ between platforms — latency comparison may not
              be apples-to-apples.
            </p>
          </div>
        )}
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
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey={leftName} fill="#222222" radius={[4, 4, 0, 0]} />
            <Bar dataKey={rightName} fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        {results.map((r, i) => {
          if (r.left.rowCount === r.right.rowCount) return null;
          return (
            <div key={i} className="flex items-center gap-2">
              <Badge variant="warning" className="text-[10px]">
                {queryNames[i] || `Query ${i + 1}`}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {leftName}: {r.left.rowCount} rows vs {rightName}:{" "}
                {r.right.rowCount} rows
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
