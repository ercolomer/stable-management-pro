"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { signInWithEmailAndPassword, type Auth } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { getFirebaseAuth, isFirebaseInitialized } from "@/lib/firebase/config";
import { LoaderCircle } from "lucide-react";
import { useTranslations } from '@/hooks/use-translations';
import { LanguageSelector } from "@/components/language-selector";
import { Separator } from "@/components/ui/separator";

const TARGET_SWITCH_EMAIL_KEY = "hallconnect_switch_target_email";

const createLoginSchema = (t: any) => z.object({
  email: z.string().email(t('invalidCredentials')),
  password: z.string().min(1, t('passwordRequired')),
});

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 48 48" {...props}>
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
    <path fill="none" d="M0 0h48v48H0z"></path>
  </svg>
);

export function LoginForm() {
  const t = useTranslations('auth');
  const tCommon = useTranslations('common');
  const { user, signInWithGoogle, signOut, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [firebaseAuthInstance, setFirebaseAuthInstance] = useState<Auth | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const [targetSwitchEmail, setTargetSwitchEmail] = useState<string>("");
  const { toast } = useToast();
  const router = useRouter();

  const loginSchema = createLoginSchema(t);
  
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    setHasMounted(true);
    
    // Detectar si hay un email objetivo para cambio de cuenta
    if (typeof window !== 'undefined') {
      const storedTargetEmail = localStorage.getItem(TARGET_SWITCH_EMAIL_KEY);
      if (storedTargetEmail) {
        setTargetSwitchEmail(storedTargetEmail);
        form.setValue("email", storedTargetEmail);
        console.log('[LoginForm] Email objetivo detectado:', storedTargetEmail);
      }
    }
    
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
  }, [form]);

  // Redirect if already authenticated (but not if adding another account)
  useEffect(() => {
    if (user) {
      // Check if we're trying to add another account by looking at the URL params or if we have a target switch email
      const urlParams = new URLSearchParams(window.location.search);
      const isAddingAccount = urlParams.get('addAccount') === 'true';
      const hasTargetEmail = !!targetSwitchEmail;
      
      if (!isAddingAccount && !hasTargetEmail) {
        console.log('[LoginForm] User already authenticated, redirecting to home');
        router.push('/');
      } else {
        console.log('[LoginForm] User authenticated but adding account or switching, staying on login');
      }
    }
  }, [user, router, targetSwitchEmail]);

  // Don't render if user is already authenticated and not adding/switching accounts
  if (user) {
    const urlParams = new URLSearchParams(window.location.search);
    const isAddingAccount = urlParams.get('addAccount') === 'true';
    const hasTargetEmail = !!targetSwitchEmail;
    
    if (!isAddingAccount && !hasTargetEmail) {
      return null;
    }
  }

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    if (!firebaseAuthInstance) {
      toast({
        variant: "destructive",
        title: tCommon('error'),
        description: t('firebaseConfigError'),
      });
      return;
    }

    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(firebaseAuthInstance, values.email, values.password);
      
      console.log('[LoginForm] Login successful:', userCredential.user.uid);
      
      // Limpiar el email objetivo después del login exitoso
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TARGET_SWITCH_EMAIL_KEY);
      }
      
      toast({
        title: t('googleSignInSuccess'),
        description: `${tCommon('welcome')}, ${userCredential.user.email}`,
      });

      // Navigation will be handled by the useAuth hook
      
    } catch (error: any) {
      console.error('[LoginForm] Login error:', error);
      
      let errorMessage = t('loginError');
      
      // Handle specific Firebase auth errors
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = t('invalidCredentials');
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Demasiados intentos fallidos. Intenta más tarde.';
      }
      
      toast({
        variant: "destructive",
        title: tCommon('error'),
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      console.log('[LoginForm] Google sign-in initiated successfully');
      
      // Limpiar el email objetivo después del login con Google
      if (typeof window !== 'undefined') {
        localStorage.removeItem(TARGET_SWITCH_EMAIL_KEY);
      }
    } catch (err: any) {
      console.error("Error de login con Google:", err);
      
      // Handle specific error cases
      if (err.code === 'auth/popup-closed-by-user') {
        return; // User closed popup, don't show error
      } else if (err.code === 'auth/cancelled-popup-request') {
        return; // User cancelled, don't show error
      }
      
      toast({
        variant: "destructive",
        title: t('googleSignInError'),
        description: err.message || t('googleSignInError'),
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSignOutCurrent = async () => {
    try {
      await signOut();
      console.log('[LoginForm] Signed out current user for account switching');
    } catch (error) {
      console.error('[LoginForm] Error signing out:', error);
    }
  };

  // Check if we're adding an account
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const isAddingAccount = urlParams.get('addAccount') === 'true';

  if (!hasMounted || !firebaseAuthInstance || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="absolute top-4 right-4">
          <LanguageSelector />
        </div>
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Connected Stable</CardTitle>
            <CardDescription className="text-center">
              {t('initializingServices')}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-2 p-8">
            <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">{t('initializingServices')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="absolute top-4 right-4">
        <LanguageSelector />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Connected Stable</CardTitle>
          <CardDescription className="text-center">
            {isAddingAccount ? t('addAnotherAccount') : (targetSwitchEmail ? `${t('loginAs')} ${targetSwitchEmail}` : t('login'))}
          </CardDescription>
          {isAddingAccount && user && (
            <div className="bg-muted/50 rounded-lg p-3 mt-3">
              <p className="text-sm text-muted-foreground text-center mb-2">
                Currently signed in as: <span className="font-medium">{user.email}</span>
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full" 
                onClick={handleSignOutCurrent}
              >
                {t('useAnotherAccount')}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder={t('emailPlaceholder')}
                {...form.register("email")}
                disabled={isLoading || isGoogleLoading || !!targetSwitchEmail}
                className={targetSwitchEmail ? "bg-muted" : ""}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder={t('passwordPlaceholder')}
                {...form.register("password")}
                disabled={isLoading || isGoogleLoading}
                autoFocus={!!targetSwitchEmail}
              />
              {form.formState.errors.password && (
                <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>
              )}
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || isGoogleLoading}
            >
              {isLoading ? (
                <>
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                  {tCommon('loading')}...
                </>
              ) : (
                t('login')
              )}
            </Button>
          </form>

          {!targetSwitchEmail && (
            <>
              <div className="relative w-full my-4">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                  o
                </span>
              </div>

              <Button 
                variant="outline" 
                className="w-full" 
                type="button" 
                onClick={handleGoogleSignIn} 
                disabled={isLoading || isGoogleLoading}
              >
                {isGoogleLoading ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <GoogleIcon className="mr-2 h-5 w-5" />
                )}
                Google
              </Button>
            </>
          )}

          <div className="mt-4 text-center text-sm">
            {targetSwitchEmail ? (
              <Button 
                variant="link" 
                className="p-0 h-auto text-sm text-primary hover:underline"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem(TARGET_SWITCH_EMAIL_KEY);
                    setTargetSwitchEmail("");
                    form.setValue("email", "");
                  }
                }}
              >
                {t('useAnotherAccount')}
              </Button>
            ) : (
              <Link href="/forgot-password" className="text-primary hover:underline">
                {t('forgotPassword')}
              </Link>
            )}
          </div>
          
          {!targetSwitchEmail && (
            <div className="mt-2 text-center text-sm">
              {t('noAccount')}{" "}
              <Link href="/register" className="text-primary hover:underline">
                {t('signUp')}
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
