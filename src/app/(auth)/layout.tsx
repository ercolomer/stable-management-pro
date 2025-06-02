
import type { Metadata } from "next";
import { LogoIcon } from "@/components/icons/logo-icon";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Autenticación - HallConnect",
  description: "Inicia sesión o regístrate en HallConnect.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 text-center">
        <Link href="/" className="inline-block">
          <LogoIcon className="h-16 w-16 text-primary" />
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">
          HallConnect
        </h1>
        <p className="text-muted-foreground">Conectando jinetes y jefes de cuadra.</p>
      </div>
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
