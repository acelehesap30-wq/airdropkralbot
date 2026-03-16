import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Blueprint: app shell <= 220KB gzip, scene runtime <= 650KB gzip
  output: 'standalone',
  reactStrictMode: true,
  // React 19 + Next.js 15 monorepo @types/react dual-version workaround
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  transpilePackages: [
    '@airdropkralbot/contracts',
    '@airdropkralbot/ui',
    '@airdropkralbot/scene',
    '@airdropkralbot/i18n',
  ],
  // Telegram Mini App requires no trailing slash
  trailingSlash: false,
  // Blueprint: FMP <= 1200ms, first interactive <= 2200ms
  experimental: {
    optimizePackageImports: [
      '@babylonjs/core',
      '@babylonjs/loaders',
      '@tanstack/react-query',
      'zustand',
    ],
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'ALLOWALL' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
      ],
    },
  ],
};

export default nextConfig;
