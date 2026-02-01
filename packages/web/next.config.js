/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@hooks/shared'],
  output: 'standalone',
};

module.exports = nextConfig;
