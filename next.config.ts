import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "drizzle-orm"],
};

export default nextConfig;
