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
import { useTranslations } from 'next-intl';


export default function SettingsPage() {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
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
      setPasswordError(t('passwordNotMatch'));
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError(t('passwordMinLength'));
      return;
    }
    if (!user || !user.email) {
        setPasswordError(t('userInfoError'));
        return;
    }

    setIsPasswordLoading(true);
    try {
      const authInstance = getFirebaseAuth(); // Get instance here
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential); // User object comes from useAuth()
      await updatePassword(user, newPassword); // User object comes from useAuth()
      setPasswordSuccess(t('passwordUpdated'));
      toast({ title: t('success'), description: t('passwordUpdated') });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error) {
      console.error("Error al cambiar contraseña:", error);
      let msg = t('passwordChangeError');
       if (error instanceof Error && 'code' in error) {
        const firebaseError = error as { code: string; message: string };
        if (firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/invalid-credential') {
          msg = t('wrongPassword');
        } else if (firebaseError.code === 'auth/too-many-requests') {
          msg = t('tooManyRequests');
        }
      }
      setPasswordError(msg);
      toast({ title: t('error'), description: msg, variant: "destructive" });
    } finally {
      setIsPasswordLoading(false);
    }
  };
  
  const handleDeleteAccount = async () => {
    if (!user || !user.email) {
      setDeleteError(t('deleteUserInfoError'));
      return;
    }
    setIsDeleteLoading(true);
    setDeleteError(null);
    try {
      const authInstance = getFirebaseAuth(); // Get instance here
      const credential = EmailAuthProvider.credential(user.email, reauthPassword);
      await reauthenticateWithCredential(user, credential);
      await deleteUser(user);
      toast({ title: t('accountDeleted'), description: t('accountDeletedPermanently') });
      setIsReauthDialogOpen(false);
      router.push("/login"); 
    } catch (error) {
       console.error("Error al eliminar cuenta:", error);
       let msg = t('deleteError');
       if (error instanceof Error && 'code' in error) {
        const firebaseError = error as { code: string; message: string };
        if (firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/invalid-credential') {
          msg = t('wrongPasswordDelete');
        } else if (firebaseError.code === 'auth/too-many-requests') {
          msg = t('tooManyRequests');
        }
      }
      setDeleteError(msg);
      toast({ title: t('deleteError'), description: msg, variant: "destructive" });
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
      setProfileUpdateError(t('userNotAuthenticated'));
      toast({ title: t('error'), description: t('userNotAuthenticated'), variant: "destructive" });
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
        toast({ title: t('profileUpdated'), description: t('changesWereSaved') });
        console.log("AuthSettings: Calling refreshUserProfile...");
        refreshUserProfile().catch(err => {
            console.error("AuthSettings: Error during background refreshUserProfile:", err);
            // Optionally toast a non-critical error here if refresh fails but primary update was ok
        });
        console.log("AuthSettings: refreshUserProfile call initiated.");
      } else {
        toast({ title: t('noChanges'), description: t('noChangesDetected') });
        console.log("AuthSettings: No changes detected to save.");
      }
      
      setProfileImageFile(null); 
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

    } catch (error: any) {
      console.error("AuthSettings: Error updating profile:", error, "Code:", error.code, "Message:", error.message);
      let userFriendlyMessage = `${t('updateError')}: ${error.message || t('error')}`;
      if (error.code) {
        switch (error.code) {
          case 'storage/unauthorized':
            userFriendlyMessage = t('permissionError');
            break;
          case 'storage/canceled':
            userFriendlyMessage = t('uploadCanceled');
            break;
          case 'storage/unknown':
            userFriendlyMessage = t('unknownUploadError');
            break;
          case 'auth/requires-recent-login':
            userFriendlyMessage = t('recentLoginRequired');
            break;
          default:
            userFriendlyMessage = `${t('error')} (${error.code}): ${error.message || t('unknownUploadError')}`;
        }
      }
      setProfileUpdateError(userFriendlyMessage);
      toast({ title: t('updateError'), description: userFriendlyMessage, variant: "destructive", duration: 7000 });
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
      <h1 className="text-3xl font-bold">{t('title')}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserCircle2 className="h-6 w-6"/>{t('editProfile')}</CardTitle>
          <CardDescription>{t('updateProfileDescription')}</CardDescription>
        </CardHeader>
        <form onSubmit={handleProfileUpdateSubmit}>
          <CardContent className="space-y-6">
            {profileUpdateError && <Alert variant="destructive"><AlertTitle>{t('profileUpdateError')}</AlertTitle><AlertDescription>{profileUpdateError}</AlertDescription></Alert>}
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <Avatar className="h-24 w-24 cursor-pointer ring-2 ring-primary/30 hover:ring-primary" onClick={() => fileInputRef.current?.click()}>
                <AvatarImage src={profileImagePreview || `https://placehold.co/96x96.png?text=${newDisplayName ? newDisplayName[0].toUpperCase() : (userProfile.displayName?.[0].toUpperCase() || 'U')}`} alt={t('userAvatar')} data-ai-hint={userProfile.dataAiHint || "person portrait"} />
                <AvatarFallback className="text-3xl">{newDisplayName ? newDisplayName.substring(0,2).toUpperCase() : userProfile.displayName ? userProfile.displayName.substring(0,2).toUpperCase() : (userProfile.email?.[0].toUpperCase() || 'U')}</AvatarFallback>
              </Avatar>
              <div className="w-full">
                <Label htmlFor="profileImage" className="mb-1 block">{t('profilePicture')}</Label>
                <Input 
                  id="profileImage" 
                  type="file" 
                  accept="image/png, image/jpeg" 
                  onChange={handleFileChange} 
                  className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                  ref={fileInputRef}
                  disabled={isProfileUpdating}
                />
                <p className="text-xs text-muted-foreground mt-1">{t('clickAvatarToChange')}</p>
              </div>
            </div>
            <div>
              <Label htmlFor="displayName">{t('displayName')}</Label>
              <Input 
                id="displayName" 
                type="text" 
                value={newDisplayName} 
                onChange={(e) => setNewDisplayName(e.target.value)} 
                placeholder={t('displayNamePlaceholder')}
                disabled={isProfileUpdating} 
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isProfileUpdating || (!profileImageFile && newDisplayName === (userProfile?.displayName || ""))}>
              {isProfileUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4"/> {t('saveProfileChanges')}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('changePassword')}</CardTitle>
          <CardDescription>{t('passwordDescription')}</CardDescription>
        </CardHeader>
        <form onSubmit={handlePasswordChangeSubmit}>
          <CardContent className="space-y-4">
            {passwordError && <Alert variant="destructive"><AlertTitle>{tCommon('error')}</AlertTitle><AlertDescription>{passwordError}</AlertDescription></Alert>}
            {passwordSuccess && <Alert variant="default" className="bg-green-100 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300"><AlertTitle>{t('success')}</AlertTitle><AlertDescription>{passwordSuccess}</AlertDescription></Alert>}
            <div>
              <Label htmlFor="currentPassword">{t('currentPassword')}</Label>
              <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required disabled={isPasswordLoading} />
            </div>
            <div>
              <Label htmlFor="newPassword">{t('newPassword')}</Label>
              <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required disabled={isPasswordLoading} />
            </div>
            <div>
              <Label htmlFor="confirmNewPassword">{t('confirmNewPassword')}</Label>
              <Input id="confirmNewPassword" type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} required disabled={isPasswordLoading} />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isPasswordLoading}>
              {isPasswordLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('changePassword')}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2"><ShieldAlert className="h-5 w-5" /> {t('dangerZone')}</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="mb-4">
            {t('deleteAccountDescription')}
          </CardDescription>
          <Button 
            onClick={() => setIsReauthDialogOpen(true)} 
            variant="destructive" 
            className="bg-red-600 hover:bg-red-700"
          >
            <Trash2 className="mr-2 h-4 w-4" /> {t('deleteAccount')}
          </Button>
          
          {isReauthDialogOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div className="fixed inset-0 bg-black/50" onClick={() => setIsReauthDialogOpen(false)} />
              <div className="relative z-50 w-full max-w-md p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
                <h2 className="text-lg font-semibold text-destructive mb-2">{t('confirmDeleteTitle')}</h2>
                <p className="text-sm text-muted-foreground mb-4">{t('confirmDeleteDescription')}</p>
                
                <div className="space-y-2 mb-4">
                  <Label htmlFor="reauthPassword">{t('currentPasswordForDelete')}</Label>
                  <Input 
                    id="reauthPassword" 
                    type="password" 
                    value={reauthPassword} 
                    onChange={(e) => setReauthPassword(e.target.value)} 
                    placeholder={t('passwordPlaceholder')}
                    disabled={isDeleteLoading}
                  />
                  {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {setDeleteError(null); setReauthPassword(""); setIsReauthDialogOpen(false);}}
                    disabled={isDeleteLoading}
                  >
                    {t('cancel')}
                  </Button>
                  <Button 
                    onClick={handleDeleteAccount} 
                    disabled={isDeleteLoading || !reauthPassword} 
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {isDeleteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('deleteAccountPermanently')}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
    </div>
  );
}

