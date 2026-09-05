/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@cbd/ui", "@cbd/shared-types", "@cbd/database"],
  // Standalone build — nhỏ gọn cho Docker image (xem prompt Dockerize riêng).
  output: "standalone",
};

module.exports = nextConfig;
