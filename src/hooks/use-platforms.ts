"use client";

import { useState, useEffect, useCallback } from "react";
import { PlatformId, HealthCheckResult } from "@/lib/platforms/types";

export interface PlatformStatus {
  id: PlatformId;
  name: string;
  configured: boolean;
  health: HealthCheckResult | null;
}

export function usePlatforms() {
  const [platforms, setPlatforms] = useState<PlatformStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platforms");
      const data = await res.json();
      setPlatforms(data);
    } catch (err) {
      console.error("Failed to fetch platforms:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const configuredPlatforms = platforms.filter((p) => p.configured);

  return { platforms, configuredPlatforms, loading, refresh };
}
