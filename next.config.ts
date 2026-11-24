import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Moss uses a native (computer-specific) module: let Node load it directly instead of bundling it.
  serverExternalPackages: ['@moss-js/moss'],
};

export default nextConfig;
