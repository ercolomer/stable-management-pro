import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConditionalToaster } from "@/components/ui/conditional-toaster";
import { LanguageProvider } from "@/contexts/language-context";
import { NextIntlClientProvider } from 'next-intl';
import { AuthProvider } from "@/contexts/auth-context";
import AppLayout from "@/components/layout/app-layout";
import { getMessages } from 'next-intl/server';
import { cookies } from 'next/headers';
import { type Locale } from '@/lib/translations';
import ErrorBoundary from "@/components/error-boundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "Connected Stable",
    template: "%s | Connected Stable"
  },
  description: "Sistema integral de gestión de cuadras y equinos",
  applicationName: "Connected Stable",
  authors: [{ name: "Connected Stable Team" }],
  generator: "Next.js",
  keywords: ["cuadra", "equinos", "caballos", "gestión", "jinetes", "stable", "management"],
  referrer: "origin-when-cross-origin",
  creator: "Connected Stable Team",
  publisher: "Connected Stable",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://stable-management-pro-89fdd.web.app'),
  openGraph: {
    type: "website",
    siteName: "Connected Stable",
    title: "Connected Stable",
    description: "Sistema integral de gestión de cuadras y equinos",
    url: "https://stable-management-pro-89fdd.web.app",
    images: [
      {
        url: "/pwa-screenshot-1.png",
        width: 1280,
        height: 720,
        alt: "Connected Stable - Panel Principal"
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Connected Stable",
    description: "Sistema integral de gestión de cuadras y equinos",
    images: ["/pwa-screenshot-1.png"],
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Connected Stable",
    startupImage: [
      {
        url: "/apple-touch-icon.png",
        media: "(device-width: 768px) and (device-height: 1024px)",
      },
    ],
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/apple-touch-icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/apple-touch-icon-144x144.png", sizes: "144x144", type: "image/png" },
      { url: "/apple-touch-icon-120x120.png", sizes: "120x120", type: "image/png" },
      { url: "/apple-touch-icon-114x114.png", sizes: "114x114", type: "image/png" },
      { url: "/apple-touch-icon-76x76.png", sizes: "76x76", type: "image/png" },
      { url: "/apple-touch-icon-72x72.png", sizes: "72x72", type: "image/png" },
      { url: "/apple-touch-icon-60x60.png", sizes: "60x60", type: "image/png" },
      { url: "/apple-touch-icon-57x57.png", sizes: "57x57", type: "image/png" },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/safari-pinned-tab.svg",
        color: "#2d5a2d",
      },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Connected Stable",
    "application-name": "Connected Stable",
    "msapplication-TileColor": "#2d5a2d",
    "msapplication-config": "/browserconfig.xml",
    "theme-color": "#2d5a2d",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2d5a2d" },
    { media: "(prefers-color-scheme: dark)", color: "#2d5a2d" },
  ],
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Obtener locale de las cookies - MISMO CÓDIGO QUE i18n.ts
  const cookieStore = await cookies();
  const savedLocale = cookieStore.get('preferred-locale')?.value;
  
  let locale: Locale = 'es';
  if (savedLocale && (savedLocale === 'es' || savedLocale === 'en' || savedLocale === 'de')) {
    locale = savedLocale as Locale;
  }
  
  console.log(`[RootLayout] Locale detectado: ${locale} (cookie: ${savedLocale || 'ninguna'})`);
  
  // Obtener mensajes usando la configuración de i18n.ts
  const messages = await getMessages();
  console.log("[RootLayout] Messages loaded, sample keys:", Object.keys(messages).slice(0, 3));

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* PWA Meta Tags adicionales */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#2d5a2d" />
        <meta name="msapplication-TileColor" content="#2d5a2d" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        
        {/* PWA iOS específicos */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Connected Stable" />
        
        {/* PWA Android específicos */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Connected Stable" />
        
        {/* Tema para navegadores */}
        <meta name="theme-color" content="#2d5a2d" />
        <meta name="color-scheme" content="light dark" />
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          <NextIntlClientProvider messages={messages} locale={locale}>
            <LanguageProvider>
              <AuthProvider>
                <AppLayout>
                  {children}
                  <ConditionalToaster />
                </AppLayout>
              </AuthProvider>
            </LanguageProvider>
          </NextIntlClientProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
