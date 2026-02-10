"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SchemaComparisonResult } from "@/hooks/use-comparison";
import { formatMs } from "@/lib/utils";
import { useState } from "react";

interface SchemaDiffProps {
  result: SchemaComparisonResult;
}

export function SchemaDiff({ result }: SchemaDiffProps) {
  const [filter, setFilter] = useState<"all" | "diff" | "match">("all");

  const filtered =
    filter === "all"
      ? result.diff
      : result.diff.filter((d) =>
          filter === "diff" ? d.status !== "match" : d.status === "match",
        );

  const diffCount = result.diff.filter((d) => d.status !== "match").length;
  const matchCount = result.diff.filter((d) => d.status === "match").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span>
            <strong>{result.left.name}</strong>: {result.left.tableCount} tables
            ({formatMs(result.left.latencyMs)})
          </span>
          <span>
            <strong>{result.right.name}</strong>: {result.right.tableCount}{" "}
            tables ({formatMs(result.right.latencyMs)})
          </span>
        </div>
        <div className="flex gap-1">
          <Badge
            variant={filter === "all" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setFilter("all")}
          >
            All ({result.diff.length})
          </Badge>
          <Badge
            variant={filter === "diff" ? "destructive" : "outline"}
            className="cursor-pointer"
            onClick={() => setFilter("diff")}
          >
            Diff ({diffCount})
          </Badge>
          <Badge
            variant={filter === "match" ? "success" : "outline"}
            className="cursor-pointer"
            onClick={() => setFilter("match")}
          >
            Match ({matchCount})
          </Badge>
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map((entry) => (
          <TableDiffCard key={entry.table} entry={entry} result={result} />
        ))}
      </div>
    </div>
  );
}

function TableDiffCard({
  entry,
  result,
}: {
  entry: SchemaComparisonResult["diff"][0];
  result: SchemaComparisonResult;
}) {
  const [expanded, setExpanded] = useState(entry.status !== "match");

  return (
    <Card>
      <CardHeader
        className="py-3 px-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-mono">{entry.table}</CardTitle>
          <Badge
            variant={
              entry.status === "match"
                ? "success"
                : entry.status === "left_only"
                  ? "warning"
                  : entry.status === "right_only"
                    ? "warning"
                    : "destructive"
            }
          >
            {entry.status === "match"
              ? "Match"
              : entry.status === "left_only"
                ? `Only in ${result.left.name}`
                : entry.status === "right_only"
                  ? `Only in ${result.right.name}`
                  : "Different"}
          </Badge>
        </div>
      </CardHeader>
      {expanded && entry.columns.length > 0 && (
        <CardContent className="pt-0 px-4 pb-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Column</TableHead>
                <TableHead>{result.left.name}</TableHead>
                <TableHead>{result.right.name}</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entry.columns.map((col) => (
                <TableRow key={col.name}>
                  <TableCell className="font-mono text-xs">
                    {col.name}
                  </TableCell>
                  <TableCell className="text-xs">
                    {col.left
                      ? `${col.left.dataType}${col.left.isNullable ? " NULL" : " NOT NULL"}`
                      : "-"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {col.right
                      ? `${col.right.dataType}${col.right.isNullable ? " NULL" : " NOT NULL"}`
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        col.status === "match"
                          ? "success"
                          : col.status === "diff"
                            ? "destructive"
                            : "warning"
                      }
                      className="text-[10px]"
                    >
                      {col.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      )}
    </Card>
  );
}
