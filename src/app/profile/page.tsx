"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react"; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, UserCog, LogOut, Building, DoorOpen, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile as UserProfileType, UserRole } from "@/types"; 
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input"; 
import { Label } from "@/components/ui/label"; 
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getDb } from "@/lib/firebase/config"; 
import { doc, setDoc, Timestamp, updateDoc, arrayUnion, arrayRemove, writeBatch } from "firebase/firestore";
import { useTranslations } from 'next-intl';


export default function ProfilePage() {
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');
  const authContext = useAuth();
  const { 
    user, 
    userProfile, 
    loading: authLoading, 
    signOut, 
    refreshUserProfile,
    activeSimulationRole,
    newStableNameState,
    setNewStableNameState,
    joinStableCodeState,
    setJoinStableCodeState,
    isProcessingStableAction,
    handleCreateNewStable: contextHandleCreateNewStable,
    handleJoinStableRequest: contextHandleJoinStableRequest,
    handleLeaveStable: contextHandleLeaveStable,
    setNavigateToPath,
  } = authContext;
  const router = useRouter();
  const { toast } = useToast();

  const [selectedRoleForNewUser, setSelectedRoleForNewUser] = useState<UserRole | null>(userProfile?.role || null);
  const [isSavingRole, setIsSavingRole] = useState(false);
  // const firebaseAuth = getFirebaseAuth(); // REMOVED: Unused and called too early

  useEffect(() => {
    if (userProfile && userProfile.role) {
        setSelectedRoleForNewUser(userProfile.role);
    }
  }, [userProfile]);

  const handleSaveRole = async () => {
    if (!user) { 
        toast({ title: t('errorSavingRole'), description: t('userNotFound'), variant: "destructive" });
        return;
    }
    if (!selectedRoleForNewUser) {
      toast({ title: tCommon('error'), description: t('selectRoleFirst'), variant: "destructive" });
      return;
    }
    setIsSavingRole(true);
    const db = getDb(); 
    const userDocRef = doc(db, "users", user.uid);
    try {
      const userProfileDataToSave: Partial<UserProfileType> = { // Partial because we are only setting/updating some fields
        uid: user.uid,
        email: user.email,
        displayName: userProfile?.displayName || user.displayName || user.email,
        photoURL: userProfile?.photoURL || user.photoURL,
        role: selectedRoleForNewUser,
        dataAiHint: userProfile?.dataAiHint || "person",
        // stableId, stableName, requestedStableId are not set here, they are set by joining/creating stables
      };

      await setDoc(userDocRef, userProfileDataToSave, { merge: true });
      toast({ title: t('roleSaved'), description: `${t('roleEstablished')} ${selectedRoleForNewUser.replace("_", " ")}.` });
      await refreshUserProfile(); 
      if (setNavigateToPath) setNavigateToPath('/profile'); // Re-evaluate navigation
    } catch (error: any) {
      console.error("ProfilePage: Error saving role/creating profile:", error);
      toast({ title: tCommon('error'), description: `${t('errorSavingRole')} ${error.message || ''} ${tCommon('code')}: ${error.code || 'N/A'}`, variant: "destructive" });
    } finally {
      setIsSavingRole(false);
    }
  };


  if (authLoading || (!user && !activeSimulationRole)) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user && activeSimulationRole) {
     return (
        <div className="container mx-auto max-w-md py-8 text-center">
            <p className="text-muted-foreground">{t('loadingSimulation')}</p>
            <Loader2 className="mx-auto mt-4 h-8 w-8 animate-spin text-primary" />
        </div>
     );
  }
  
  if (!user) { 
    return <div className="container mx-auto py-8 text-center"><p>{t('pleaseSignIn')}</p></div>;
  }

  if (!userProfile || userProfile.role === null) { // User authenticated, but profile doc not found or role not set
    return (
      <div className="container mx-auto max-w-md py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{t('welcome')} {userProfile?.displayName || user.displayName || user.email}!</CardTitle>
            <CardDescription>{t('continueSelectRole')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="roleSelectProfilePage">{t('yourMainRole')}</Label>
              <Select onValueChange={(value) => setSelectedRoleForNewUser(value as UserRole)} value={selectedRoleForNewUser || undefined}>
                <SelectTrigger id="roleSelectProfilePage" disabled={isSavingRole}>
                  <SelectValue placeholder={t('selectRole')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jinete">{t('roleOptions.jinete')}</SelectItem>
                  <SelectItem value="jefe de cuadra">{t('roleOptions.jefeDeQuadra')}</SelectItem>
                  <SelectItem value="mozo de cuadra">{t('roleOptions.mozoDeCuadra')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleSaveRole} disabled={isSavingRole || !selectedRoleForNewUser}>
              {isSavingRole && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('saveAndContinue')}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto max-w-2xl py-8 space-y-8">
      <Card className="shadow-lg">
        <CardHeader className="items-center text-center">
          <Avatar className="h-24 w-24 mb-4 ring-2 ring-primary ring-offset-2">
            <AvatarImage 
                src={userProfile.photoURL || `https://placehold.co/100x100.png?text=${userProfile.displayName ? userProfile.displayName.substring(0,2).toUpperCase() : 'U'}`} 
                alt={userProfile.displayName || t('userAvatar')} 
                data-ai-hint={userProfile.dataAiHint || "person portrait"}
            />
            <AvatarFallback className="text-3xl">{userProfile.displayName ? userProfile.displayName.substring(0,2).toUpperCase() : userProfile.email ? userProfile.email[0].toUpperCase() : 'U'}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-3xl">{userProfile.displayName} {activeSimulationRole ? `(${tCommon('simulation')} ${activeSimulationRole.replace(/([A-Z])/g, ' $1').trim()})` : ""}</CardTitle>
          <CardDescription className="text-lg">{userProfile.email}</CardDescription>
          {userProfile.role && <CardDescription className="text-md capitalize">{t('mainRole')} {userProfile.role.replace("_", " ")}</CardDescription>}
        </CardHeader>
        
        <CardContent className="space-y-6">
            {userProfile.stableId && userProfile.stableName && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Building className="h-5 w-5 text-primary" />
                            {t('currentStable')} {userProfile.stableName}
                        </CardTitle>
                        <CardDescription>{t('stableCode')} <span className="font-mono">{userProfile.stableId}</span></CardDescription>
                    </CardHeader>
                    <CardFooter className="flex-col sm:flex-row gap-2 justify-start">
                         <Button 
                           onClick={() => {
                             const targetPath = userProfile.role === 'jefe de cuadra' ? '/dashboard/jefe' : 
                                              userProfile.role === 'mozo de cuadra' ? '/dashboard/mozo' : '/dashboard/jinete';
                             if (setNavigateToPath) setNavigateToPath(targetPath);
                           }} 
                           disabled={isProcessingStableAction}
                           className="w-full sm:w-auto"
                         >
                            <DoorOpen className="mr-2 h-4 w-4"/>{t('goToStableDashboard')}
                        </Button>
                        <Button variant="outline" onClick={contextHandleLeaveStable} disabled={isProcessingStableAction} className="w-full sm:w-auto">
                            {isProcessingStableAction && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            {t('leaveStable')}
                        </Button>
                    </CardFooter>
                </Card>
            )}

            {userProfile.requestedStableId && !userProfile.stableId && (
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-amber-700 dark:text-amber-500 flex items-center gap-2">
                            <Loader2 className="h-5 w-5 animate-spin"/> {t('pendingRequest')}
                        </CardTitle>
                        <CardDescription>
                        {t('requestPendingDescription')} <span className="font-mono">{userProfile.requestedStableId}</span> {t('pendingApproval')}
                        </CardDescription>
                    </CardHeader>
                </Card>
            )}

            {userProfile.role === 'jefe de cuadra' && !userProfile.stableId && (
              <Card>
                <CardHeader><CardTitle>{t('createNewStable')}</CardTitle></CardHeader>
                <CardContent>
                  <Label htmlFor="newStableNameProfilePage">{t('stableName')}</Label>
                  <Input 
                    id="newStableNameProfilePage" 
                    value={newStableNameState}
                    onChange={(e) => setNewStableNameState(e.target.value)} 
                    placeholder={t('stableNamePlaceholder')} 
                    disabled={isProcessingStableAction}
                  />
                </CardContent>
                <CardFooter>
                  <Button onClick={contextHandleCreateNewStable} disabled={isProcessingStableAction || !newStableNameState.trim()}>
                    {isProcessingStableAction && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    {t('createStable')}
                  </Button>
                </CardFooter>
              </Card>
            )}
            
             {userProfile && !userProfile.stableId && !userProfile.requestedStableId && (
              <Card>
                <CardHeader><CardTitle>{t('joinExistingStable')}</CardTitle></CardHeader>
                <CardContent>
                  <Label htmlFor="joinStableCodeProfilePage">{t('stableCodeInput')}</Label>
                  <Input 
                    id="joinStableCodeProfilePage" 
                    value={joinStableCodeState}
                    onChange={(e) => setJoinStableCodeState(e.target.value)} 
                    placeholder={t('stableCodePlaceholder')} 
                    disabled={isProcessingStableAction} 
                    maxLength={14}
                  />
                </CardContent>
                <CardFooter>
                  <Button onClick={contextHandleJoinStableRequest} disabled={isProcessingStableAction || !joinStableCodeState.trim() || joinStableCodeState.length !== 14}>
                    {isProcessingStableAction && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    {t('requestJoin')}
                  </Button>
                </CardFooter>
              </Card>
            )}
        </CardContent>
        <CardFooter className="border-t pt-6 flex flex-col sm:flex-row justify-between items-center gap-2">
             <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href="/settings">
                    <UserCog className="mr-2 h-4 w-4" /> {t('accountSettings')}
                </Link>
            </Button>
            <Button onClick={signOut} variant="ghost" className="w-full sm:w-auto text-destructive hover:text-destructive">
                <LogOut className="mr-2 h-4 w-4" /> {t('signOut')}
            </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

