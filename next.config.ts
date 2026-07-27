import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  // Evita o Turbopack inferir a raiz do workspace errada quando há mais de um
  // lockfile na árvore (ex: rodando um worktree dentro deste repo) — sem isso
  // o dev server passa a observar mudanças de arquivo fora deste checkout.
  turbopack: {
    root: path.join(__dirname),
  },
  serverExternalPackages: ["pdf-to-img", "pdfjs-dist"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "i.pravatar.cc",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
