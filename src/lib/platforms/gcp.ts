import { BasePgPlatform } from "./base";
import { PlatformId } from "./types";

export class GcpPlatform extends BasePgPlatform {
  id: PlatformId = "gcp";
  name = "GCP (Source)";
  envKey = "DATABASE_URL_GCP";
}
