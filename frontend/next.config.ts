import type { NextConfig } from "next";
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({
  path: path.resolve(__dirname, "../.env")
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  distDir: process.env.NEXT_DIST_DIR || ".next"
};

export default nextConfig;
