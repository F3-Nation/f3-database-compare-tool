"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SchemaDiff } from "./schema-diff";
import { DataDiff } from "./data-diff";
import { PerformanceChart } from "./performance-chart";
import { LatencyAnalytics } from "./latency-analytics";
import {
  ComparisonResult,
  SchemaComparisonResult,
} from "@/hooks/use-comparison";
import { Database, Layers, BarChart3 } from "lucide-react";

interface ComparisonPanelProps {
  schemaResult: SchemaComparisonResult | null;
  dataResult: ComparisonResult | null;
  performanceResults: ComparisonResult[];
  queryNames: string[];
}

export function ComparisonPanel({
  schemaResult,
  dataResult,
  performanceResults,
  queryNames,
}: ComparisonPanelProps) {
  return (
    <Tabs defaultValue="data" className="w-full">
      <TabsList>
        <TabsTrigger value="data">Data Compare</TabsTrigger>
        <TabsTrigger value="schema">Schema Compare</TabsTrigger>
        <TabsTrigger value="performance">Performance</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
      </TabsList>

      <TabsContent value="data">
        {dataResult ? (
          <DataDiff result={dataResult} />
        ) : (
          <EmptyState
            icon={<Database className="h-10 w-10 text-muted-foreground/40" />}
            message="Run a query to compare data between platforms"
            hint="Select two platforms above and execute a preset or custom SQL query"
          />
        )}
      </TabsContent>

      <TabsContent value="schema">
        {schemaResult ? (
          <SchemaDiff result={schemaResult} />
        ) : (
          <EmptyState
            icon={<Layers className="h-10 w-10 text-muted-foreground/40" />}
            message="Select two platforms to compare schemas"
            hint='Click "Compare Schemas" to see structural differences'
          />
        )}
      </TabsContent>

      <TabsContent value="performance">
        {performanceResults.length > 0 ? (
          <PerformanceChart
            results={performanceResults}
            queryNames={queryNames}
          />
        ) : (
          <EmptyState
            icon={<BarChart3 className="h-10 w-10 text-muted-foreground/40" />}
            message="Run queries to see performance comparison"
            hint="Each query you run will be added to the performance chart"
          />
        )}
      </TabsContent>

      <TabsContent value="analytics">
        <LatencyAnalytics />
      </TabsContent>
    </Tabs>
  );
}

function EmptyState({
  icon,
  message,
  hint,
}: {
  icon: React.ReactNode;
  message: string;
  hint: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3">
      {icon}
      <p className="text-sm text-muted-foreground">{message}</p>
      <p className="text-xs text-muted-foreground/60">{hint}</p>
    </div>
  );
}
