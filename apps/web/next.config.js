/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  ...(process.env.GITHUB_PAGES === 'true' ? { output: 'export', basePath: '/intellect', images: { unoptimized: true } } : {}),
  transpilePackages: ['@intellect/ui', '@intellect/shared'],
  experimental: {
    optimizePackageImports: ['@intellect/ui', 'lucide-react'],
  },
  ... (process.env.GITHUB_PAGES === 'true' ? {} : { images: {
    domains: ['localhost', 'img.youtube.com', 'i.ytimg.com', 'via.placeholder.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: '**.ytimg.com',
      },
    ],
  },
  } }),
  async rewrites() {
    if (process.env.GITHUB_PAGES === 'true') return [];
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;