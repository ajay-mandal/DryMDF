import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.DRYMDF_DESKTOP === "1" && {
    output: "export",
    trailingSlash: true,
    env: { NEXT_PUBLIC_DRYMDF_DESKTOP: "1" },
  }),
};

export default nextConfig;
