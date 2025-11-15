import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empty turbopack config to silence warnings
  turbopack: {},

  webpack: (config, { isServer }) => {
    // Fallback for modules not found
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      dns: false,
    };

    // Ignore test files
    config.module.rules.push({
      test: /\.(test|spec)\.(ts|tsx|js|jsx)$/,
      loader: 'ignore-loader',
    });

    // Ignore problematic files in thread-stream
    config.module.rules.push({
      test: /node_modules\/thread-stream\/.*\.(test|md|zip|LICENSE|sh|yml)$/,
      loader: 'ignore-loader',
    });

    return config;
  },
};

export default nextConfig;
