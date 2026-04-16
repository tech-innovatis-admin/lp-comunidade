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
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-VXCKTGXVQ2"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-VXCKTGXVQ2');
          `}
        </Script>

        {/* Meta Pixel */}
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;
            n.push=n;
            n.loaded=!0;
            n.version='2.0';
            n.queue=[];
            t=b.createElement(e);t.async=!0;
            t.src=v;
            s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s);
            }(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');

            fbq('init', '717814604097091');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=717814604097091&ev=PageView&noscript=1"
          />
        </noscript>

        <ParticlesBackground />
        <div className="flex-grow flex flex-col">
          {children}
        </div>
        <MiniFooter />
      </body>
    </html>
  );
}
