import type { Metadata } from "next";
import { LogoIcon } from "@/components/icons/logo-icon";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Autenticación - Connected Stable",
  description: "Inicia sesión o regístrate en Connected Stable.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 text-center">
        <div className="inline-block">
          <LogoIcon className="h-16 w-16 text-primary" />
        </div>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground">
          Connected Stable
        </h1>
        <p className="text-muted-foreground">Sistema de gestión de cuadras</p>
      </div>
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
