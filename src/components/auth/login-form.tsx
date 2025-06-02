
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
import { signInWithEmailAndPassword, type Auth } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { Separator } from "@/components/ui/separator";
import { getFirebaseAuth, isFirebaseInitialized } from "@/lib/firebase/config";

const loginSchema = z.object({
  email: z.string().email("Introduce un correo electrónico válido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 48 48" {...props}>
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
    <path fill="none" d="M0 0h48v48H0z"></path>
  </svg>
);

const TARGET_SWITCH_EMAIL_KEY = "hallconnect_switch_target_email"; // Define key consistently

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const authContext = useAuth(); 
  const [firebaseAuthInstance, setFirebaseAuthInstance] = useState<Auth | null>(null);
  const [hasMounted, setHasMounted] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

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


  useEffect(() => {
    if (!firebaseAuthInstance || !hasMounted || !form) return;

    const targetEmail = localStorage.getItem(TARGET_SWITCH_EMAIL_KEY);
    if (targetEmail && typeof targetEmail === 'string' && targetEmail.trim() !== "" && targetEmail !== "null") {
      form.setValue("email", targetEmail, { shouldValidate: true });
    }
    // Always remove the key after attempting to read it to prevent it from affecting future logins
    localStorage.removeItem(TARGET_SWITCH_EMAIL_KEY);

  }, [firebaseAuthInstance, form, hasMounted]);


  const onSubmit = async (data: LoginFormValues) => {
    if (!firebaseAuthInstance) {
      setError("Servicio de autenticación no está listo. Intenta de nuevo en un momento.");
      toast({ title: "Error", description: "Servicio de autenticación no está listo.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(firebaseAuthInstance, data.email, data.password);
      toast({
        title: "Inicio de Sesión Exitoso",
        description: "Bienvenido de nuevo.",
      });
      // Navigation is handled by AuthContext
    } catch (err) {
      console.error("Error de inicio de sesión:", err);
      let errorMessage = "Ocurrió un error al iniciar sesión. Inténtalo de nuevo.";
      if (err instanceof Error && 'code' in err) {
        const firebaseError = err as { code: string; message: string };
        if (firebaseError.code === "auth/user-not-found" || firebaseError.code === "auth/wrong-password" || firebaseError.code === "auth/invalid-credential") {
          errorMessage = "Correo electrónico o contraseña incorrectos.";
        }
      }
      setError(errorMessage);
      toast({
        title: "Error de Inicio de Sesión",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!firebaseAuthInstance) {
       setError("Servicio de autenticación no está listo. Intenta de nuevo en un momento.");
       toast({ title: "Error", description: "Servicio de autenticación no está listo.", variant: "destructive" });
      return;
    }
    setIsGoogleLoading(true);
    setError(null);
    try {
      await authContext.signInWithGoogle();
      // Navigation is handled by AuthContext
    } catch (err) {
      console.error("Error de inicio de sesión con Google:", err);
      setError("No se pudo iniciar sesión con Google. Inténtalo de nuevo.");
      toast({
        title: "Error de Inicio de Sesión con Google",
        description: "No se pudo iniciar sesión con Google. Inténtalo de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const LoadingLoginUI = (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
        <CardDescription>Accede a tu cuenta de HallConnect.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center space-y-2 p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Inicializando servicios...</p>
      </CardContent>
    </Card>
  );

  if (!hasMounted || !firebaseAuthInstance) {
    return LoadingLoginUI;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
        <CardDescription>Accede a tu cuenta de HallConnect.</CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@correo.com"
              {...form.register("email")}
              disabled={isLoading || isGoogleLoading || !firebaseAuthInstance}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="********"
              {...form.register("password")}
              disabled={isLoading || isGoogleLoading || !firebaseAuthInstance}
            />
            {form.formState.errors.password && (
              <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>
          <div className="text-sm">
            <Link href="/password-reset" className="font-medium text-primary hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading || !firebaseAuthInstance}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Iniciar Sesión
          </Button>
          
          <div className="relative w-full">
            <Separator className="my-2" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
              O CONTINUAR CON
            </span>
          </div>

          <Button variant="outline" className="w-full" type="button" onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading || !firebaseAuthInstance}>
            {isGoogleLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <GoogleIcon className="mr-2 h-5 w-5" />
            )}
            Google
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            ¿No tienes una cuenta?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Regístrate
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
