/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8000',
        pathname: '/storage/**',
      },
      {
        protocol: 'https',
        hostname: '*.keskinkamp.com.tr',
        pathname: '/storage/**',
      },
      {
        protocol: 'https',
        hostname: '*.keskinkamp.com.tr',
        pathname: '/storage/**',
      },
      {
        protocol: 'https',
        hostname: 'keskinkamp.com.tr',
        pathname: '/storage/**',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/storage/:path*',
        destination: `${process.env.STORAGE_URL || process.env.API_URL?.replace(/\/api$/, '') || 'http://127.0.0.1:8000'}/storage/:path*`,
      },
    ];
  },
};

export default nextConfig;
