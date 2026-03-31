/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@zapp/shared-types", "@zapp/ui", "@zapp/web3-sdk", "@zapp/simulation"],
  reactStrictMode: true,
};

export default nextConfig;
