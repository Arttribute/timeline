import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent server-side bundling of problematic packages
  serverExternalPackages: ['pino', 'thread-stream', 'pino-pretty'],

  // Empty turbopack config to acknowledge we're using it
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

    // Completely ignore test directories
    config.module.rules.push({
      test: /node_modules\/thread-stream\/test\//,
      loader: 'ignore-loader',
    });

    // Ignore all test files globally (including .mjs)
    config.module.rules.push({
      test: /\.(test|spec)\.(ts|tsx|js|jsx|mjs)$/,
      loader: 'ignore-loader',
    });

    // Ignore non-code files in node_modules
    config.module.rules.push({
      test: /node_modules\/.*\.(md|zip|LICENSE|sh|yml)$/,
      loader: 'ignore-loader',
    });

    return config;
  },
};

export default nextConfig;
