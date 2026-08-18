/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '192.168.29.81',
    '192.168.56.1',
  ],
  // Fix: Turbopack root — suppresses the package-lock.json warning when the
  // project folder sits outside the detected git repository root
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;
