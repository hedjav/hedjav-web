import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      // Supabase Storage (covers uploadées via admin futures)
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
}

export default nextConfig
