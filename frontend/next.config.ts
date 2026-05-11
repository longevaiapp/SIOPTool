import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    // Demo build: skip type/lint blocking. Re-enable once API layer lands.
    typescript: { ignoreBuildErrors: true },
    eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
