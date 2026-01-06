import path from "path";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.*.*"],
};

export default nextConfig;
