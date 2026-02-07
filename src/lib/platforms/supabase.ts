import { BasePgPlatform } from "./base";
import { PlatformId } from "./types";

export class SupabasePlatform extends BasePgPlatform {
  id: PlatformId = "supabase";
  name = "Supabase";
  envKey = "DATABASE_URL_SUPABASE";
}
