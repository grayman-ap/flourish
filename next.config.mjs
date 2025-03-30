import withBundleAnalyzer from '@next/bundle-analyzer';
import withPWA from 'next-pwa';

// Bundle analyzer configuration
const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

// Base Next.js configuration
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    disableStaticImages: true,
  },
  devIndicators: {
    autoPrerender: false,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.optimization.minimize = false;
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

// Conditionally apply PWA wrapper based on environment
const applyConfig = () => {
  // Check if we're in development mode
  const isDev = process.env.NODE_ENV === 'development';
  
  // Only apply PWA in production, not in development
  if (isDev) {
    console.log('PWA features disabled in development mode');
    return bundleAnalyzer(nextConfig);
  } else {
    // Apply PWA wrapper in production
    const pwaConfig = withPWA({
      dest: 'public',
      register: true,
      skipWaiting: true,
      cacheOnFrontEndNav: true,
      // Disable workbox logging in production to reduce console noise
      disable: false,
    });
    
    return pwaConfig(bundleAnalyzer(nextConfig));
  }
};

export default applyConfig();
