import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the platforms module (imported by the route for side effects)
vi.mock("@/lib/platforms", () => ({}));

// Mock the registry
const mockGetPlatform = vi.fn();
vi.mock("@/lib/platforms/registry", () => ({
  getPlatform: (...args: unknown[]) => mockGetPlatform(...args),
}));

function makePlatform(overrides: {
  id: string;
  name: string;
  configured?: boolean;
  schema?: {
    tables: Array<{
      name: string;
      schema: string;
      columns: Array<{
        name: string;
        dataType: string;
        isNullable: boolean;
        columnDefault: string | null;
        ordinalPosition: number;
      }>;
    }>;
    latencyMs: number;
  };
  schemaError?: Error;
}) {
  return {
    id: overrides.id,
    name: overrides.name,
    isConfigured: () => overrides.configured ?? true,
    getSchema: overrides.schemaError
      ? vi.fn().mockRejectedValue(overrides.schemaError)
      : vi
          .fn()
          .mockResolvedValue(overrides.schema ?? { tables: [], latencyMs: 5 }),
  };
}

function makeRequest(body: Record<string, unknown>) {
  return new Request("http://localhost:3002/api/compare/schema", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Schema Compare API", () => {
  beforeEach(() => {
    mockGetPlatform.mockReset();
  });

  it("returns 400 when leftId or rightId is missing", async () => {
    const { POST } = await import("@/app/api/compare/schema/route");
    const res = await POST(makeRequest({ leftId: "", rightId: "neon" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("required");
  });

  it("returns 404 for unknown platform", async () => {
    mockGetPlatform.mockReturnValue(undefined);
    const { POST } = await import("@/app/api/compare/schema/route");
    const res = await POST(makeRequest({ leftId: "unknown", rightId: "neon" }));
    expect(res.status).toBe(404);
  });

  it("returns 500 when getSchema throws", async () => {
    const left = makePlatform({
      id: "gcp",
      name: "GCP",
      schemaError: new Error("connection refused"),
    });
    const right = makePlatform({ id: "neon", name: "Neon" });

    mockGetPlatform.mockImplementation((id: string) => {
      if (id === "gcp") return left;
      if (id === "neon") return right;
      return undefined;
    });

    const { POST } = await import("@/app/api/compare/schema/route");
    const res = await POST(makeRequest({ leftId: "gcp", rightId: "neon" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain("connection refused");
  });

  it("builds correct diff for matching schemas", async () => {
    const schema = {
      tables: [
        {
          name: "users",
          schema: "public",
          columns: [
            {
              name: "id",
              dataType: "integer",
              isNullable: false,
              columnDefault: null,
              ordinalPosition: 1,
            },
            {
              name: "name",
              dataType: "text",
              isNullable: true,
              columnDefault: null,
              ordinalPosition: 2,
            },
          ],
        },
      ],
      latencyMs: 10,
    };

    const left = makePlatform({ id: "gcp", name: "GCP", schema });
    const right = makePlatform({ id: "neon", name: "Neon", schema });

    mockGetPlatform.mockImplementation((id: string) => {
      if (id === "gcp") return left;
      if (id === "neon") return right;
      return undefined;
    });

    const { POST } = await import("@/app/api/compare/schema/route");
    const res = await POST(makeRequest({ leftId: "gcp", rightId: "neon" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.diff).toHaveLength(1);
    expect(json.diff[0].status).toBe("match");
    expect(json.diff[0].table).toBe("public.users");
  });

  it("detects left_only and right_only tables", async () => {
    const leftSchema = {
      tables: [{ name: "users", schema: "public", columns: [] }],
      latencyMs: 5,
    };
    const rightSchema = {
      tables: [{ name: "posts", schema: "public", columns: [] }],
      latencyMs: 5,
    };

    const left = makePlatform({ id: "gcp", name: "GCP", schema: leftSchema });
    const right = makePlatform({
      id: "neon",
      name: "Neon",
      schema: rightSchema,
    });

    mockGetPlatform.mockImplementation((id: string) => {
      if (id === "gcp") return left;
      if (id === "neon") return right;
      return undefined;
    });

    const { POST } = await import("@/app/api/compare/schema/route");
    const res = await POST(makeRequest({ leftId: "gcp", rightId: "neon" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.diff).toHaveLength(2);

    const leftOnly = json.diff.find(
      (d: { table: string }) => d.table === "public.users",
    );
    expect(leftOnly.status).toBe("left_only");

    const rightOnly = json.diff.find(
      (d: { table: string }) => d.table === "public.posts",
    );
    expect(rightOnly.status).toBe("right_only");
  });

  it("detects column type differences", async () => {
    const leftSchema = {
      tables: [
        {
          name: "users",
          schema: "public",
          columns: [
            {
              name: "id",
              dataType: "integer",
              isNullable: false,
              columnDefault: null,
              ordinalPosition: 1,
            },
          ],
        },
      ],
      latencyMs: 5,
    };
    const rightSchema = {
      tables: [
        {
          name: "users",
          schema: "public",
          columns: [
            {
              name: "id",
              dataType: "bigint",
              isNullable: false,
              columnDefault: null,
              ordinalPosition: 1,
            },
          ],
        },
      ],
      latencyMs: 5,
    };

    const left = makePlatform({ id: "gcp", name: "GCP", schema: leftSchema });
    const right = makePlatform({
      id: "neon",
      name: "Neon",
      schema: rightSchema,
    });

    mockGetPlatform.mockImplementation((id: string) => {
      if (id === "gcp") return left;
      if (id === "neon") return right;
      return undefined;
    });

    const { POST } = await import("@/app/api/compare/schema/route");
    const res = await POST(makeRequest({ leftId: "gcp", rightId: "neon" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.diff[0].status).toBe("diff");
    expect(json.diff[0].columns[0].status).toBe("diff");
  });
});
