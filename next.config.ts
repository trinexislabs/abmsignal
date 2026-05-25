import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // bullmq / ioredis use native Node.js modules that cannot be bundled by webpack.
  serverExternalPackages: ['bullmq', 'ioredis'],

  // Allow the Mac browser on the LAN to connect to the dev server's
  // HMR/SSE endpoints without being blocked as a cross-origin request.
  allowedDevOrigins: ['192.168.1.*'],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },
};

export default nextConfig;