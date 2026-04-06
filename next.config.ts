import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/credit", destination: "/credits", permanent: false },
    ];
  },
};

export default nextConfig;
