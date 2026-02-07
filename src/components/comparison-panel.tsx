"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SchemaDiff } from "./schema-diff";
import { DataDiff } from "./data-diff";
import { PerformanceChart } from "./performance-chart";
import {
  ComparisonResult,
  SchemaComparisonResult,
} from "@/hooks/use-comparison";

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
      </TabsList>

      <TabsContent value="data">
        {dataResult ? (
          <DataDiff result={dataResult} />
        ) : (
          <EmptyState message="Run a query to compare data between platforms" />
        )}
      </TabsContent>

      <TabsContent value="schema">
        {schemaResult ? (
          <SchemaDiff result={schemaResult} />
        ) : (
          <EmptyState message="Select two platforms to compare schemas" />
        )}
      </TabsContent>

      <TabsContent value="performance">
        {performanceResults.length > 0 ? (
          <PerformanceChart
            results={performanceResults}
            queryNames={queryNames}
          />
        ) : (
          <EmptyState message="Run queries to see performance comparison" />
        )}
      </TabsContent>
    </Tabs>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
      {message}
    </div>
  );
}
