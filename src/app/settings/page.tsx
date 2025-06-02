
"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider, deleteUser, updateProfile } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { getDb, getFirebaseStorage, getFirebaseAuth } from "@/lib/firebase/config"; // getFirebaseAuth was missing
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { Loader2, ShieldAlert, Trash2, UserCircle2, Save } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


export default function SettingsPage() {
  const { user, userProfile, loading: authLoading, refreshUserProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  // const auth = getFirebaseAuth(); // Removed as it's not strictly needed here and can cause init issues if called too early. User object from context is preferred.

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const [isDeleteLoading, setIsDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [reauthPassword, setReauthPassword] = useState("");
  const [isReauthDialogOpen, setIsReauthDialogOpen] = useState(false);

  const [newDisplayName, setNewDisplayName] = useState("");
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [isProfileUpdating, setIsProfileUpdating] = useState(false);
  const [profileUpdateError, setProfileUpdateError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
    if (userProfile) {
      setNewDisplayName(userProfile.displayName || "");
      setProfileImagePreview(userProfile.photoURL || null);
    }
  }, [user, userProfile, authLoading, router]);

  const handlePasswordChangeSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmNewPassword) {
      setPasswordError("Las nuevas contraseñas no coinciden.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (!user || !user.email) {
        setPasswordError("No se pudo obtener la información del usuario para el cambio de contraseña.");
        return;
    }

    setIsPasswordLoading(true);
    try {
      const authInstance = getFirebaseAuth(); // Get instance here
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential); // User object comes from useAuth()
      await updatePassword(user, newPassword); // User object comes from useAuth()
      setPasswordSuccess("Contraseña actualizada con éxito.");
      toast({ title: "Éxito", description: "Tu contraseña ha sido actualizada." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error) {
      console.error("Error al cambiar contraseña:", error);
      let msg = "Error al cambiar la contraseña. Verifica tu contraseña actual.";
       if (error instanceof Error && 'code' in error) {
        const firebaseError = error as { code: string; message: string };
        if (firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/invalid-credential') {
          msg = "La contraseña actual es incorrecta.";
        } else if (firebaseError.code === 'auth/too-many-requests') {
          msg = "Demasiados intentos fallidos. Inténtalo más tarde.";
        }
      }
      setPasswordError(msg);
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsPasswordLoading(false);
    }
  };
  
  const handleDeleteAccount = async () => {
    if (!user || !user.email) {
      setDeleteError("No se pudo obtener la información del usuario para eliminar la cuenta.");
      return;
    }
    setIsDeleteLoading(true);
    setDeleteError(null);
    try {
      const authInstance = getFirebaseAuth(); // Get instance here
      const credential = EmailAuthProvider.credential(user.email, reauthPassword);
      await reauthenticateWithCredential(user, credential);
      await deleteUser(user);
      toast({ title: "Cuenta Eliminada", description: "Tu cuenta ha sido eliminada permanentemente." });
      setIsReauthDialogOpen(false);
      router.push("/login"); 
    } catch (error) {
       console.error("Error al eliminar cuenta:", error);
       let msg = "Error al eliminar la cuenta.";
       if (error instanceof Error && 'code' in error) {
        const firebaseError = error as { code: string; message: string };
        if (firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/invalid-credential') {
          msg = "La contraseña es incorrecta. No se pudo verificar para eliminar la cuenta.";
        } else if (firebaseError.code === 'auth/too-many-requests') {
          msg = "Demasiados intentos fallidos. Inténtalo más tarde.";
        }
      }
      setDeleteError(msg);
      toast({ title: "Error al Eliminar", description: msg, variant: "destructive" });
    } finally {
      setIsDeleteLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setProfileImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileUpdateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) {
      setProfileUpdateError("Usuario no autenticado.");
      toast({ title: "Error", description: "Usuario no autenticado.", variant: "destructive" });
      return;
    }
    setIsProfileUpdating(true);
    setProfileUpdateError(null);
    console.log("AuthSettings: Starting profile update...");

    let newPhotoURL = userProfile?.photoURL || null;
    const updatesForAuth: { displayName?: string; photoURL?: string } = {};
    const updatesForFirestore: { displayName?: string; photoURL?: string; dataAiHint?: string } = {}; // Added dataAiHint

    if (newDisplayName.trim() !== "" && newDisplayName.trim() !== (userProfile?.displayName || "")) {
      updatesForAuth.displayName = newDisplayName.trim();
      updatesForFirestore.displayName = newDisplayName.trim();
    }

    try {
      if (profileImageFile) {
        console.log("AuthSettings: Profile image file selected. Attempting upload...");
        const storage = getFirebaseStorage();
        const imageExtension = profileImageFile.name.split('.').pop()?.toLowerCase() || 'png';
        const imageRef = storageRef(storage, `profile-pictures/${user.uid}/profile.${imageExtension}`);
        
        console.log("AuthSettings: Uploading to Firebase Storage as", imageRef.fullPath);
        await uploadBytes(imageRef, profileImageFile);
        console.log("AuthSettings: Upload successful. Getting download URL...");
        newPhotoURL = await getDownloadURL(imageRef);
        console.log("AuthSettings: Download URL obtained:", newPhotoURL);
        
        updatesForAuth.photoURL = newPhotoURL;
        updatesForFirestore.photoURL = newPhotoURL;
        updatesForFirestore.dataAiHint = "person portrait"; // Update hint for new custom image
      }

      let profileActuallyUpdated = false;

      if (Object.keys(updatesForAuth).length > 0) {
        console.log("AuthSettings: Updating Firebase Auth profile with:", updatesForAuth);
        await updateProfile(user, updatesForAuth);
        console.log("AuthSettings: Firebase Auth profile updated.");
        profileActuallyUpdated = true;
      }

      if (Object.keys(updatesForFirestore).length > 0) {
        console.log("AuthSettings: Updating Firestore document with:", updatesForFirestore);
        const db = getDb();
        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, updatesForFirestore);
        console.log("AuthSettings: Firestore document updated.");
        profileActuallyUpdated = true;
      }

      if (profileActuallyUpdated) {
        toast({ title: "Perfil Actualizado", description: "Tus cambios han sido guardados." });
        console.log("AuthSettings: Calling refreshUserProfile...");
        refreshUserProfile().catch(err => {
            console.error("AuthSettings: Error during background refreshUserProfile:", err);
            // Optionally toast a non-critical error here if refresh fails but primary update was ok
        });
        console.log("AuthSettings: refreshUserProfile call initiated.");
      } else {
        toast({ title: "Sin Cambios", description: "No se detectaron cambios para guardar." });
        console.log("AuthSettings: No changes detected to save.");
      }
      
      setProfileImageFile(null); 
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

    } catch (error: any) {
      console.error("AuthSettings: Error updating profile:", error, "Code:", error.code, "Message:", error.message);
      let userFriendlyMessage = `Error al actualizar el perfil: ${error.message || 'Error desconocido'}`;
      if (error.code) {
        switch (error.code) {
          case 'storage/unauthorized':
            userFriendlyMessage = "Error de permisos: No tienes permiso para subir esta imagen. Revisa las reglas de Firebase Storage.";
            break;
          case 'storage/canceled':
            userFriendlyMessage = "La subida de la imagen fue cancelada.";
            break;
          case 'storage/unknown':
            userFriendlyMessage = "Ocurrió un error desconocido al subir la imagen. Intenta de nuevo.";
            break;
          case 'auth/requires-recent-login':
            userFriendlyMessage = "Esta operación requiere un inicio de sesión reciente. Por favor, cierra sesión y vuelve a iniciar sesión.";
            break;
          default:
            userFriendlyMessage = `Error (${error.code}): ${error.message || 'Error desconocido al actualizar perfil.'}`;
        }
      }
      setProfileUpdateError(userFriendlyMessage);
      toast({ title: "Error de Actualización", description: userFriendlyMessage, variant: "destructive", duration: 7000 });
    } finally {
      console.log("AuthSettings: Profile update process finished. Setting isProfileUpdating to false.");
      setIsProfileUpdating(false);
    }
  };


  if (authLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
   if (!user || !userProfile) { // userProfile might still be loading if user exists but profile fetch is async
    // If auth is done but no user, redirect handled by useEffect. If user exists but no profile yet, show loader or minimal UI.
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }


  return (
    <div className="container mx-auto max-w-2xl py-8 space-y-8">
      <h1 className="text-3xl font-bold">Ajustes de Cuenta</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserCircle2 className="h-6 w-6"/>Editar Perfil</CardTitle>
          <CardDescription>Actualiza tu nombre visible y foto de perfil.</CardDescription>
        </CardHeader>
        <form onSubmit={handleProfileUpdateSubmit}>
          <CardContent className="space-y-6">
            {profileUpdateError && <Alert variant="destructive"><AlertTitle>Error de Perfil</AlertTitle><AlertDescription>{profileUpdateError}</AlertDescription></Alert>}
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <Avatar className="h-24 w-24 cursor-pointer ring-2 ring-primary/30 hover:ring-primary" onClick={() => fileInputRef.current?.click()}>
                <AvatarImage src={profileImagePreview || `https://placehold.co/96x96.png?text=${newDisplayName ? newDisplayName[0].toUpperCase() : (userProfile.displayName?.[0].toUpperCase() || 'U')}`} alt="Avatar de Usuario" data-ai-hint={userProfile.dataAiHint || "person portrait"} />
                <AvatarFallback className="text-3xl">{newDisplayName ? newDisplayName.substring(0,2).toUpperCase() : userProfile.displayName ? userProfile.displayName.substring(0,2).toUpperCase() : (userProfile.email?.[0].toUpperCase() || 'U')}</AvatarFallback>
              </Avatar>
              <div className="w-full">
                <Label htmlFor="profileImage" className="mb-1 block">Foto de Perfil (PNG, JPG)</Label>
                <Input 
                  id="profileImage" 
                  type="file" 
                  accept="image/png, image/jpeg" 
                  onChange={handleFileChange} 
                  className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  ref={fileInputRef}
                  disabled={isProfileUpdating}
                />
                <p className="text-xs text-muted-foreground mt-1">Haz clic en el avatar para cambiar la imagen también.</p>
              </div>
            </div>
            <div>
              <Label htmlFor="displayName">Nombre Visible</Label>
              <Input 
                id="displayName" 
                type="text" 
                value={newDisplayName} 
                onChange={(e) => setNewDisplayName(e.target.value)} 
                placeholder="Tu nombre completo o apodo"
                disabled={isProfileUpdating} 
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isProfileUpdating || (!profileImageFile && newDisplayName === (userProfile?.displayName || ""))}>
              {isProfileUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4"/> Guardar Cambios de Perfil
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cambiar Contraseña</CardTitle>
          <CardDescription>Actualiza tu contraseña para mantener tu cuenta segura.</CardDescription>
        </CardHeader>
        <form onSubmit={handlePasswordChangeSubmit}>
          <CardContent className="space-y-4">
            {passwordError && <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{passwordError}</AlertDescription></Alert>}
            {passwordSuccess && <Alert variant="default" className="bg-green-100 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300"><AlertTitle>Éxito</AlertTitle><AlertDescription>{passwordSuccess}</AlertDescription></Alert>}
            <div>
              <Label htmlFor="currentPassword">Contraseña Actual</Label>
              <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required disabled={isPasswordLoading} />
            </div>
            <div>
              <Label htmlFor="newPassword">Nueva Contraseña</Label>
              <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required disabled={isPasswordLoading} />
            </div>
            <div>
              <Label htmlFor="confirmNewPassword">Confirmar Nueva Contraseña</Label>
              <Input id="confirmNewPassword" type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} required disabled={isPasswordLoading} />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isPasswordLoading}>
              {isPasswordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Cambiar Contraseña
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2"><ShieldAlert className="h-5 w-5" /> Zona Peligrosa</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="mb-4">
            Eliminar tu cuenta es una acción permanente e irreversible. Todos tus datos serán eliminados.
          </CardDescription>
           <AlertDialog open={isReauthDialogOpen} onOpenChange={setIsReauthDialogOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="destructive" className="bg-red-600 hover:bg-red-700">
                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar Mi Cuenta
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro de que quieres eliminar tu cuenta?</AlertDialogTitle>
                <AlertDialogDescription>
                    Esta acción no se puede deshacer. Para confirmar, por favor, introduce tu contraseña actual.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2 py-2">
                    <Label htmlFor="reauthPassword">Contraseña Actual</Label>
                    <Input 
                        id="reauthPassword" 
                        type="password" 
                        value={reauthPassword} 
                        onChange={(e) => setReauthPassword(e.target.value)} 
                        placeholder="Tu contraseña actual"
                        disabled={isDeleteLoading}
                    />
                    {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
                </div>
                <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleteLoading} onClick={() => {setDeleteError(null); setReauthPassword("");}}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount} disabled={isDeleteLoading || !reauthPassword} className="bg-red-600 hover:bg-red-700">
                    {isDeleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Eliminar Cuenta Permanentemente
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
            </AlertDialog>
        </CardContent>
      </Card>
      
    </div>
  );
}

