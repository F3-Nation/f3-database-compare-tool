import { DatabasePlatform, PlatformId } from "./types";

const platforms = new Map<PlatformId, DatabasePlatform>();

export function registerPlatform(platform: DatabasePlatform): void {
  platforms.set(platform.id, platform);
}

export function getPlatform(id: PlatformId): DatabasePlatform | undefined {
  return platforms.get(id);
}

export function getAllPlatforms(): DatabasePlatform[] {
  return Array.from(platforms.values());
}

export function getConfiguredPlatforms(): DatabasePlatform[] {
  return getAllPlatforms().filter((p) => p.isConfigured());
}
