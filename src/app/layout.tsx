
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { AuthProvider } from '@/contexts/auth-context';
import { AppLayout } from '@/components/layout/app-layout'; // AppLayout IS active
import { Toaster } from '@/components/ui/toaster';

const geistSans = GeistSans;
const geistMono = GeistMono;

export const metadata: Metadata = {
  title: 'HallConnect - Full Restore Attempt',
  description: 'Conectando jinetes y jefes de cuadra.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  console.log("[RootLayout DEBUG] Rendering with AuthProvider AND AppLayout.");
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <AuthProvider>
          <AppLayout> {/* AppLayout is now active here */}
            {children}
          </AppLayout>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
