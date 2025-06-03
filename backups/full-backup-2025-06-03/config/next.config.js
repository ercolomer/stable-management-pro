// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Headers don't work with static export, so commented out
  // async headers() {
  //   return [
  //     {
  //       // Apply these headers to all routes in your application.
  //       source: '/:path*', // Apply to all routes
  //       headers: [
  //         {
  //           key: 'Content-Security-Policy',
  //           value: "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com https://www.googletagmanager.com https://www.gstatic.com; object-src 'none'; base-uri 'self';"
  //         }
  //       ],
  //     }
  //   ]
  // },
};

const pwaEnabled = false; // Explicitly false
const pwaPluginConfig = {
  dest: "public",
};

// Export an async function to allow dynamic import for ESM module
module.exports = async (phase, { defaultConfig }) => {
  const withPWAInit = (await import('@ducanh2912/next-pwa')).default;
  const withPWA = withPWAInit({
    ...pwaPluginConfig,
    disable: !pwaEnabled
  });
  return pwaEnabled ? withPWA(nextConfig) : nextConfig;
}; 