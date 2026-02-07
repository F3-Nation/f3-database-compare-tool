import { registerPlatform } from "./registry";
import { GcpPlatform } from "./gcp";
import { LocalPlatform } from "./local";
import { NeonPlatform } from "./neon";
import { SupabasePlatform } from "./supabase";

// Auto-register all platforms
registerPlatform(new GcpPlatform());
registerPlatform(new LocalPlatform());
registerPlatform(new NeonPlatform());
registerPlatform(new SupabasePlatform());

export * from "./types";
export * from "./registry";
export { BasePgPlatform } from "./base";
