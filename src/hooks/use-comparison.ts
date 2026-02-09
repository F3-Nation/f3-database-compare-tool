"use client";

import { useState } from "react";
import { QueryResult } from "@/lib/platforms/types";

export interface ComparisonResult {
  left: QueryResult & { platformId: string; name: string };
  right: QueryResult & { platformId: string; name: string };
}

export interface SchemaComparisonResult {
  left: {
    platformId: string;
    name: string;
    tableCount: number;
    latencyMs: number;
  };
  right: {
    platformId: string;
    name: string;
    tableCount: number;
    latencyMs: number;
  };
  diff: SchemaDiffEntry[];
}

export interface SchemaDiffEntry {
  table: string;
  status: "match" | "diff" | "left_only" | "right_only";
  columns: ColumnDiffEntry[];
}

export interface ColumnDiffEntry {
  name: string;
  status: "match" | "diff" | "left_only" | "right_only";
  left: { dataType: string; isNullable: boolean } | null;
  right: { dataType: string; isNullable: boolean } | null;
}

export function useComparison() {
  const [loading, setLoading] = useState(false);
  const [dataResult, setDataResult] = useState<ComparisonResult | null>(null);
  const [schemaResult, setSchemaResult] =
    useState<SchemaComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function compareData(
    leftId: string,
    rightId: string,
    sql: string,
  ): Promise<ComparisonResult | null> {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leftId, rightId, sql }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Comparison failed");
        return null;
      }
      setDataResult(data);
      return data as ComparisonResult;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comparison failed");
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function compareSchema(leftId: string, rightId: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/compare/schema", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leftId, rightId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Schema comparison failed");
        return;
      }
      setSchemaResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Schema comparison failed");
    } finally {
      setLoading(false);
    }
  }

  return {
    loading,
    dataResult,
    schemaResult,
    error,
    compareData,
    compareSchema,
  };
}
