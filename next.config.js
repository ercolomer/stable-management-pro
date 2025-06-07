// @ts-check
const createNextIntlPlugin = require('next-intl/plugin');

// Configurar next-intl para que funcione sin rutas dinámicas
const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "localhost:3001"]
    }
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Optimizaciones para Windows/OneDrive
  webpack: (config, { isServer }) => {
    // Configurar cache para evitar problemas de permisos
    config.cache = {
      type: 'memory'
    };
    
    // Asegurar que los archivos JSON de traducción se incluyan
    config.module.rules.push({
      test: /\.json$/,
      type: 'json',
    });
    
    // Optimizaciones adicionales
    config.watchOptions = {
      ...config.watchOptions,
      poll: 1000,
      aggregateTimeout: 300,
    };
    
    return config;
  },
  // Configuración del output
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
};

module.exports = withNextIntl(nextConfig); 