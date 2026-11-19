/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['railing-womanlike-craftily.ngrok-free.dev'],

  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
