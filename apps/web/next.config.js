const isGitHubPages = process.env.GITHUB_PAGES === 'true';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_BASE_PATH: isGitHubPages ? '/intellect' : '' },
  transpilePackages: ['@intellect/ui', '@intellect/shared'],
  experimental: { optimizePackageImports: ['@intellect/ui', 'lucide-react'] },
  ...(isGitHubPages ? {
    output: 'export',
    basePath: '/intellect',
    trailingSlash: true,
    images: { unoptimized: true },
  } : {
    images: {
      domains: ['localhost', 'img.youtube.com', 'i.ytimg.com', 'via.placeholder.com'],
      remotePatterns: [
        { protocol: 'https', hostname: '**.googleapis.com' },
        { protocol: 'https', hostname: '**.ytimg.com' },
      ],
    },
    async rewrites() {
      return [{ source: '/api/:path*', destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/:path*` }];
    },
    async headers() {
      return [{
        source: '/:path*',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
        ],
      }];
    },
  }),
};

module.exports = nextConfig;
