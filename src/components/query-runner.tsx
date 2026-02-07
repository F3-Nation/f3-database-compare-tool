"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PRESET_QUERIES } from "@/lib/queries";
import { Play } from "lucide-react";

interface QueryRunnerProps {
  onRun: (sql: string) => void;
  loading: boolean;
  disabled: boolean;
}

export function QueryRunner({ onRun, loading, disabled }: QueryRunnerProps) {
  const [selectedQueryId, setSelectedQueryId] = useState(PRESET_QUERIES[0].id);
  const [customSql, setCustomSql] = useState("");
  const [mode, setMode] = useState<"preset" | "custom">("preset");

  const selectedQuery = PRESET_QUERIES.find((q) => q.id === selectedQueryId);

  const handleRun = () => {
    const sql = mode === "preset" ? selectedQuery?.sql : customSql;
    if (sql) onRun(sql);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          <Button
            variant={mode === "preset" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("preset")}
          >
            Preset
          </Button>
          <Button
            variant={mode === "custom" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("custom")}
          >
            Custom
          </Button>
        </div>

        {mode === "preset" && (
          <Select value={selectedQueryId} onValueChange={setSelectedQueryId}>
            <SelectTrigger className="w-[300px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRESET_QUERIES.map((q) => (
                <SelectItem key={q.id} value={q.id}>
                  <span className="flex items-center gap-2">
                    {q.name}
                    <Badge
                      variant={
                        q.size === "small"
                          ? "success"
                          : q.size === "medium"
                            ? "warning"
                            : "destructive"
                      }
                      className="text-[10px] px-1.5"
                    >
                      {q.size}
                    </Badge>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button
          onClick={handleRun}
          disabled={disabled || loading}
          size="sm"
          className="gap-1.5"
        >
          <Play className="h-3.5 w-3.5" />
          {loading ? "Running..." : "Run"}
        </Button>
      </div>

      {mode === "preset" && selectedQuery && (
        <div className="text-xs text-muted-foreground">
          {selectedQuery.description}
        </div>
      )}

      {mode === "custom" && (
        <textarea
          value={customSql}
          onChange={(e) => setCustomSql(e.target.value)}
          placeholder="Enter SQL query..."
          className="w-full h-32 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring resize-y"
        />
      )}

      {mode === "preset" && selectedQuery && (
        <pre className="text-xs bg-secondary/50 rounded-md p-3 overflow-x-auto font-mono text-muted-foreground">
          {selectedQuery.sql}
        </pre>
      )}
    </div>
  );
}
