import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import ParticlesBackground from "./components/ParticlesBackground";
import MiniFooter from "./components/MiniFooter";

export const metadata: Metadata = {
  title: "Innovatis - InnovaNation",
  description: "Faça parte da InnovaNation - comunidade exclusiva com acesso a editais vigentes, oportunidades de captação de recursos e parcerias estratégicas. Transforme suas ideias em realidade.",
  keywords: "inovação, tecnologia, soluções digitais, transformação digital, WhatsApp",
  openGraph: {
    title: "Innovatis - InnovaNation",
    description: "Faça parte da InnovaNation - comunidade exclusiva com acesso a editais vigentes, oportunidades de captação de recursos e parcerias estratégicas.",
    type: "website",
  },
  icons: {
    icon: "/logo_innovatis_preta.svg",
    shortcut: "/logo_innovatis_preta.svg",
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased relative flex flex-col min-h-screen bg-[#121826] text-white">
        <Script
          src="https://www.google.com/recaptcha/api.js"
          strategy="afterInteractive"
          defer
        />
        <ParticlesBackground />
        <div className="flex-grow flex flex-col">
          {children}
        </div>
        <MiniFooter />
      </body>
    </html>
  );
}
