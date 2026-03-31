/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@zapp/shared-types", "@zapp/ui", "@zapp/web3-sdk", "@zapp/simulation"],
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/chat/:path*",
        destination: "http://localhost:3001/api/chat/:path*",
      },
      {
        source: "/api/trpc/:path*",
        destination: "http://localhost:3001/:path*",
      },
    ];
  },
};

export default nextConfig;
