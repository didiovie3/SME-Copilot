import type { NextConfig } from 'next';

const nextConfig = {
  allowedDevOrigins: [
    '*.cluster-64pjnskmlbaxowh5lzq6i7v4ra.cloudworkstations.dev',
  ],
  output: 'standalone',
  env: {
    NEXT_PUBLIC_BUILD_ID: Date.now().toString(),
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'avatar.vercel.sh' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  trailingSlash: true,
  transpilePackages: ['@react-pdf/renderer'],
  webpack: (config) => {
    config.optimization.splitChunks = {
      chunks: 'all',
      maxSize: 200000,
    };
    return config;
  },
};

export default nextConfig;
