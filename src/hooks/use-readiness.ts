"use client";

import { useState, useEffect, useCallback } from "react";

export interface PlatformReadiness {
  platformId: string;
  name: string;
  tableCount: number;
  sampleRowCount: number;
  ready: boolean;
}

export function useReadiness() {
  const [readiness, setReadiness] = useState<PlatformReadiness[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/readiness");
      const json = await res.json();
      if (res.ok) {
        setReadiness(json);
      }
    } catch {
      // silently fail — readiness is advisory
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
  }, [fetch_]);

  return {
    readiness,
    loading,
    refresh: fetch_,
  };
}
