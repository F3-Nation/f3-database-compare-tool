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

const SQL_KEYWORDS =
  /\b(SELECT|FROM|WHERE|JOIN|GROUP BY|ORDER BY|LIMIT|COUNT|AS|ON|AND|OR|IN|BETWEEN|DISTINCT|HAVING|WITH|CASE|WHEN|THEN|ELSE|END|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TABLE|INDEX|NOT|NULL|IS|LIKE|EXISTS|UNION|LEFT|RIGHT|INNER|OUTER|CROSS|DESC|ASC|BY)\b/g;

function highlightSql(sql: string) {
  const parts: Array<{ text: string; isKeyword: boolean }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const regex = new RegExp(SQL_KEYWORDS.source, "gi");
  while ((match = regex.exec(sql)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: sql.slice(lastIndex, match.index), isKeyword: false });
    }
    parts.push({ text: match[0], isKeyword: true });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < sql.length) {
    parts.push({ text: sql.slice(lastIndex), isKeyword: false });
  }

  return parts.map((part, i) =>
    part.isKeyword ? (
      <span key={i} className="text-accent-brand font-semibold">
        {part.text}
      </span>
    ) : (
      <span key={i}>{part.text}</span>
    ),
  );
}

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
        {/* Segmented control */}
        <div className="relative inline-flex bg-muted rounded-lg p-0.5">
          <div
            className="absolute top-0.5 bottom-0.5 rounded-md bg-white shadow-sm transition-all duration-200"
            style={{
              width: "calc(50% - 2px)",
              left: mode === "preset" ? "2px" : "calc(50%)",
            }}
          />
          <button
            type="button"
            onClick={() => setMode("preset")}
            className={`relative z-10 px-3 py-1 text-sm font-medium rounded-md transition-colors duration-200 ${
              mode === "preset"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Preset
          </button>
          <button
            type="button"
            onClick={() => setMode("custom")}
            className={`relative z-10 px-3 py-1 text-sm font-medium rounded-md transition-colors duration-200 ${
              mode === "custom"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Custom
          </button>
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
          className="gap-1.5 bg-accent-brand hover:bg-[#0F766E] text-white active:scale-95 transition-all duration-150 px-5 py-2 text-sm"
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
          className="w-full h-32 rounded-xl border border-input bg-[#F9FAFB] px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-ring resize-y"
        />
      )}

      {mode === "preset" && selectedQuery && (
        <pre className="text-xs bg-[#F9FAFB] rounded-xl p-3 overflow-x-auto font-mono text-muted-foreground border">
          {highlightSql(selectedQuery.sql)}
        </pre>
      )}
    </div>
  );
}
