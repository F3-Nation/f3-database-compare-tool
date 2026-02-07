import { BasePgPlatform } from "./base";
import { PlatformId } from "./types";

export class NeonPlatform extends BasePgPlatform {
  id: PlatformId = "neon";
  name = "Neon";
  envKey = "DATABASE_URL_NEON";
}
