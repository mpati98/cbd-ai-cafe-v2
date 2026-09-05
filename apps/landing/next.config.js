/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@cbd/ui", "@cbd/shared-types", "@cbd/database"],
};

module.exports = nextConfig;
