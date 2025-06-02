
"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { sendPasswordResetEmail, type Auth } from "firebase/auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { getFirebaseAuth, isFirebaseInitialized } from "@/lib/firebase/config";

const passwordResetSchema = z.object({
  email: z.string().email("Introduce un correo electrónico válido."),
});

type PasswordResetFormValues = z.infer<typeof passwordResetSchema>;

export default function PasswordResetForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { toast } = useToast();
  const [firebaseAuthInstance, setFirebaseAuthInstance] = useState<Auth | null>(null);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    if (isFirebaseInitialized()) {
      setFirebaseAuthInstance(getFirebaseAuth());
    } else {
      const interval = setInterval(() => {
        if (isFirebaseInitialized()) {
          setFirebaseAuthInstance(getFirebaseAuth());
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, []);

  const form = useForm<PasswordResetFormValues>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: PasswordResetFormValues) => {
    if (!firebaseAuthInstance) {
      setError("Servicio de autenticación no está listo. Intenta de nuevo en un momento.");
      toast({ title: "Error", description: "Servicio de autenticación no está listo.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await sendPasswordResetEmail(firebaseAuthInstance, data.email);
      setSuccessMessage("Si existe una cuenta con este correo, recibirás un enlace para restablecer tu contraseña.");
      toast({
        title: "Correo Enviado",
        description: "Revisa tu bandeja de entrada para restablecer tu contraseña.",
      });
      form.reset();
    } catch (err) {
      console.error("Error al enviar correo de restablecimiento:", err);
       setError("Ocurrió un error. Por favor, inténtalo de nuevo más tarde.");
       toast({
        title: "Error",
        description: "No se pudo enviar el correo de restablecimiento.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const LoadingPasswordResetUI = (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Restablecer Contraseña</CardTitle>
        <CardDescription>Introduce tu correo electrónico para recibir un enlace de restablecimiento.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center space-y-2 p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Inicializando servicios...</p>
      </CardContent>
    </Card>
  );

  if (!hasMounted) {
    return LoadingPasswordResetUI;
  }

  if (!firebaseAuthInstance) {
    return LoadingPasswordResetUI;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Restablecer Contraseña</CardTitle>
        <CardDescription>Introduce tu correo electrónico para recibir un enlace de restablecimiento.</CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {successMessage && (
            <Alert variant="default" className="bg-green-100 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300">
              <AlertTitle>Éxito</AlertTitle>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@correo.com"
              {...form.register("email")}
              disabled={isLoading || !firebaseAuthInstance}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading || !firebaseAuthInstance}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar Enlace
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            ¿Recuerdas tu contraseña?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Inicia Sesión
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
