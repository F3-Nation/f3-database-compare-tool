import { BasePgPlatform } from "./base";
import { PlatformId } from "./types";

export class LocalPlatform extends BasePgPlatform {
  id: PlatformId = "local";
  name = "Local Docker";
  envKey = "DATABASE_URL_LOCAL";
}
