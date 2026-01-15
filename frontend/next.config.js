const path = require('path')

// Configuración básica de Next.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  trailingSlash: true,
  experimental: {
    // Configuraciones experimentales si son necesarias en el futuro
  },
  webpack: (config, { dev, isServer }) => {
    // Configurar alias para @/* paths de manera más explícita
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
    }
    return config
  },
  // REWRITES REMOVIDOS PARA EVITAR CONFLICTOS CON VARIABLES DE ENTORNO
  // async rewrites() {
  //   return [
  //     {
  //       source: '/api/:path*',
  //       destination: process.env.NODE_ENV === 'production' 
  //         ? `${process.env.NEXT_PUBLIC_FASTAPI_API_URL}/:path*`
  //         : 'http://localhost:8000/api/v1/:path*',
  //     },
  //   ];
  // },
}
module.exports = nextConfig;
