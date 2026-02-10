"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ComparisonResult } from "@/hooks/use-comparison";
import { formatMs } from "@/lib/utils";

interface DataDiffProps {
  result: ComparisonResult;
}

export function DataDiff({ result }: DataDiffProps) {
  const rowCountMatch = result.left.rowCount === result.right.rowCount;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ResultPanel
        label={result.left.name}
        data={result.left}
        otherRowCount={result.right.rowCount}
      />
      <ResultPanel
        label={result.right.name}
        data={result.right}
        otherRowCount={result.left.rowCount}
      />
      {!rowCountMatch && (
        <div className="md:col-span-2 space-y-1">
          <Badge variant="warning">
            Row count mismatch: {result.left.name} ({result.left.rowCount}) vs{" "}
            {result.right.name} ({result.right.rowCount})
          </Badge>
          {(result.left.rowCount === 0 || result.right.rowCount === 0) && (
            <p className="text-xs text-muted-foreground">
              {result.left.rowCount === 0
                ? result.left.name
                : result.right.name}{" "}
              returned 0 rows — this platform may be empty or not synced. Check
              connectivity and run{" "}
              <code className="bg-muted px-1 rounded text-[11px]">
                npm run db:sync:&lt;target&gt;
              </code>{" "}
              to populate it.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ResultPanel({
  label,
  data,
  otherRowCount,
}: {
  label: string;
  data: ComparisonResult["left"];
  otherRowCount: number;
}) {
  if (data.error) {
    return (
      <Card className="border-red-200">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">{label}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3">
          <p className="text-sm text-red-600">{data.error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{label}</CardTitle>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span>{data.rowCount} rows</span>
            <span>{formatMs(data.latencyMs)}</span>
            {data.rowCount === otherRowCount ? (
              <Badge variant="success" className="text-[10px]">
                match
              </Badge>
            ) : (
              <Badge variant="warning" className="text-[10px]">
                diff
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 overflow-auto max-h-96 min-w-0">
        <Table>
          <TableHeader>
            <TableRow>
              {data.fields.map((f) => (
                <TableHead key={f} className="text-xs font-mono">
                  {f}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.slice(0, 100).map((row, i) => (
              <TableRow key={i}>
                {data.fields.map((f) => (
                  <TableCell key={f} className="text-xs font-mono">
                    {row[f] === null ? (
                      <span className="text-muted-foreground">NULL</span>
                    ) : (
                      String(row[f])
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {data.rowCount > 100 && (
          <p className="text-xs text-muted-foreground mt-2">
            Showing 100 of {data.rowCount} rows
          </p>
        )}
      </CardContent>
    </Card>
  );
}
