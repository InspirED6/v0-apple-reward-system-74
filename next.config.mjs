/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '*.spock.replit.dev',
    '*.replit.dev',
    '*.repl.co',
    '*.picard.replit.dev',
    '*.kirk.replit.dev',
    '*.janeway.replit.dev',
    '*.sisko.replit.dev',
  ],
}

export default nextConfig
