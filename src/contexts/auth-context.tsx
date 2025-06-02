"use client";

import type { User as FirebaseUser } from "firebase/auth";
import React, { useContext, useEffect, useState, type ReactNode, useCallback, useRef, useMemo } from "react";
import { getFirebaseAuth, getDb, isFirebaseInitialized, getFirebaseApp } from "@/lib/firebase/config"; // Added getFirebaseApp
import type { UserProfile, UserRole, Stable, PendingMember } from "@/types";
import { doc, getDoc, setDoc, Timestamp, updateDoc, arrayUnion, arrayRemove, writeBatch } from "firebase/firestore";
import { useRouter, usePathname } from "next/navigation";
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut as firebaseSignOut,
  type Auth, // Import Auth type
} from "firebase/auth";
import { useToast } from "@/hooks/use-toast";

const AUTH_ROUTES = ['/login', '/register', '/password-reset'];
const LINKED_ACCOUNTS_STORAGE_KEY = "hallconnect_linked_accounts";
const TARGET_SWITCH_UID_KEY = "hallconnect_target_switch_uid";
const TARGET_SWITCH_EMAIL_KEY = "hallconnect_switch_target_email";
const AUTH_TIMEOUT_DURATION = 15000; // 15 seconds

interface LinkedAccountInfo {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL?: string | null;
  dataAiHint?: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: any;
  refreshUserProfile: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;

  activeStableId: string | null;
  activeRole: UserRole | null;
  activeStableName: string | null;
  activeSimulationRole?: UserRole | 'jineteConCuadra' | 'jineteSinCuadra' | null;

  newStableNameState: string;
  setNewStableNameState: React.Dispatch<React.SetStateAction<string>>;
  joinStableCodeState: string;
  setJoinStableCodeState: React.Dispatch<React.SetStateAction<string>>;
  isProcessingStableAction: boolean;
  handleCreateNewStable: () => Promise<void>;
  handleJoinStableRequest: () => Promise<void>;
  handleLeaveStable: () => Promise<void>;
  setNavigateToPath: (path: string | null) => void;

  linkedAccounts: LinkedAccountInfo[];
  addAccountToSwitcher: (user: FirebaseUser, profile?: UserProfile | null) => void;
  removeAccountFromSwitcher: (uid: string) => void;
  switchAccount: (targetUid: string) => Promise<void>;
  isSwitchingAccount: boolean;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);


function generateStableCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 14; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  console.log("[AuthContext] AuthProvider component rendering - TOP LEVEL");
  const [userState, setUserState] = useState<FirebaseUser | null>(null);
  const [userProfileState, setUserProfileState] = useState<UserProfile | null>(null);
  const [loadingState, setLoadingState] = useState(true);
  const loadingStateRef = useRef(loadingState);
  useEffect(() => { loadingStateRef.current = loadingState; }, [loadingState]);

  const [errorState, setErrorState] = useState<unknown | null>(null);
  const [isInitialClientLoadState, setIsInitialClientLoadState] = useState(true);
  const [navigateToPathState, setNavigateToPathInternal] = useState<string | null>(null);
  const justNavigatedRef = useRef(false);
  const router = useRouter();
  const currentPath = usePathname();
  const { toast } = useToast();

  const [newStableNameFormState, setNewStableNameFormState] = useState("");
  const [joinStableCodeFormState, setJoinStableCodeFormState] = useState("");
  const [isProcessingStableActionFormState, setIsProcessingStableActionFormState] = useState(false);
  const [activeStableIdState, setActiveStableIdContextState] = useState<string | null>(null);
  const [activeRoleState, setActiveRoleContextState] = useState<UserRole | null>(null);
  const [activeStableNameState, setActiveStableNameContextState] = useState<string | null>(null);
  
  const activeStableIdStateRef = useRef(activeStableIdState);
  useEffect(() => { activeStableIdStateRef.current = activeStableIdState; }, [activeStableIdState]);
  const activeRoleStateRef = useRef(activeRoleState);
  useEffect(() => { activeRoleStateRef.current = activeRoleState; }, [activeRoleState]);


  const [linkedAccountsState, setLinkedAccountsState] = useState<LinkedAccountInfo[]>([]);
  const [isSwitchingAccountState, setIsSwitchingAccountState] = useState(false);

  const userRef = useRef(userState);
  const userProfileRef = useRef(userProfileState);
  const authTimeoutRef = useRef<NodeJS.Timeout | null>(null);


  useEffect(() => { userRef.current = userState; }, [userState]);
  useEffect(() => { userProfileRef.current = userProfileState; }, [userProfileState]);

  const setNavigateToPath = useCallback((newPath: string | null) => {
    // Log includes currentPath for context, but currentPath is not a direct dependency for *setting* the request
    console.log(`[AuthContext] setNavigateToPath CALLED with: ${newPath}. (Current browser path was: ${currentPath})`);
    setNavigateToPathInternal(newPath);
  }, [currentPath]); // currentPath is used for logging, not for the decision to set internal state

  const determineActiveMembershipCallback = useCallback(async (
    currentProfileForCallback: UserProfile | null
  ): Promise<{ activeStableId: string | null, activeRole: UserRole | null, activeStableName: string | null }> => {
    console.log("[AuthContext] determineActiveMembershipCallback - START. Profile:", currentProfileForCallback ? currentProfileForCallback.uid.substring(0,5) : "null");
    let newActiveStableId: string | null = null;
    let newActiveRole: UserRole | null = null;
    let newActiveStableName: string | null = null;

    if (currentProfileForCallback) {
        newActiveStableId = currentProfileForCallback.stableId;
        newActiveRole = currentProfileForCallback.role;
        if (currentProfileForCallback.stableId) {
            if (!currentProfileForCallback.stableName && currentProfileForCallback.stableId) {
                 const db = getDb();
                 try {
                    console.log("[AuthContext] determineActiveMembershipCallback - Denormalizing stable name for ID:", currentProfileForCallback.stableId.substring(0,5));
                    const stableDoc = await getDoc(doc(db, "stables", currentProfileForCallback.stableId));
                    newActiveStableName = stableDoc.exists() ? (stableDoc.data() as Stable).name : null;
                    console.log("[AuthContext] determineActiveMembershipCallback - Denormalized stable name:", newActiveStableName);
                 } catch (e) { console.error("[AuthContext] determineActiveMembershipCallback - Error denormalizing stable name", e); newActiveStableName = null;}
            } else {
                newActiveStableName = currentProfileForCallback.stableName || null;
            }
        }
    }
    setActiveStableIdContextState(newActiveStableId);
    setActiveRoleContextState(newActiveRole);
    setActiveStableNameContextState(newActiveStableName);
    console.log(`[AuthContext] determineActiveMembershipCallback - END. Active StableID: ${newActiveStableId ? newActiveStableId.substring(0,5) : 'null'}, Role: ${newActiveRole}, Name: ${newActiveStableName}`);
    return { activeStableId: newActiveStableId, activeRole: newActiveRole, activeStableName: newActiveStableName };
  }, []);

  const fetchUserProfile = useCallback(async (firebaseUserToFetch: FirebaseUser): Promise<UserProfile | null> => {
    console.log("[AuthContext] fetchUserProfile - START for UID:", firebaseUserToFetch.uid.substring(0,5));
    if (!isFirebaseInitialized()) {
      console.error("[AuthContext] fetchUserProfile - Firebase not initialized. Aborting profile fetch.");
      toast({ title: "Error de Firebase", description: "Los servicios de Firebase no están disponibles. Revisa la configuración.", variant: "destructive", duration: 7000 });
      setErrorState(new Error("Firebase not initialized"));
      return null;
    }
    const db = getDb();
    try {
      const userDocRef = doc(db, "users", firebaseUserToFetch.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        console.log("[AuthContext] fetchUserProfile - Profile found for UID:", firebaseUserToFetch.uid.substring(0,5));
        return userDocSnap.data() as UserProfile;
      }
      console.log("[AuthContext] fetchUserProfile - No profile found for UID:", firebaseUserToFetch.uid.substring(0,5));
      return null;
    } catch (e: any) {
      toast({ title: "Error de Perfil", description: `No se pudo cargar tu perfil: ${e.message || 'Error desconocido'}. Código: ${e.code || 'N/A'}`, variant: "destructive"});
      setErrorState(e);
      console.error("[AuthContext] fetchUserProfile - Error fetching profile:", e);
      return null;
    }
  }, [toast]);

  const signOutUserCb = useCallback(async (isAccountSwitch: boolean = false) => {
    if (typeof window === 'undefined') return;
    console.log(`[AuthContext] signOutUserCb - START. Is switch: ${isAccountSwitch}`);
    setIsSwitchingAccountState(true);
    setLoadingState(true);

    if (authTimeoutRef.current) { clearTimeout(authTimeoutRef.current); authTimeoutRef.current = null; }

    if (userRef.current && isFirebaseInitialized()) {
      try {
        const auth = getFirebaseAuth(); // Get instance before use
        await firebaseSignOut(auth);
        console.log("[AuthContext] signOutUserCb - Firebase sign out successful.");
      } catch (e) {
        console.error("[AuthContext] signOutUserCb - Error during Firebase signOut:", e);
        setErrorState(e);
      }
    } else {
      console.log("[AuthContext] signOutUserCb - No user to sign out or Firebase not initialized.");
    }

    if (!isAccountSwitch) {
      console.log("[AuthContext] signOutUserCb - Full sign out, removing target switch keys.");
      localStorage.removeItem(TARGET_SWITCH_UID_KEY);
      localStorage.removeItem(TARGET_SWITCH_EMAIL_KEY);
    }
    setNavigateToPath('/login');
  }, [setNavigateToPath]);

  const addAccountToSwitcherCb = useCallback((user: FirebaseUser, profile?: UserProfile | null) => {
    if (typeof window === 'undefined') return;
    console.log("[AuthContext] addAccountToSwitcherCb - Adding/Updating UID:", user.uid.substring(0,5));
    setLinkedAccountsState(prev => {
      const existingAccount = prev.find(acc => acc.uid === user.uid);
      const newAccountInfo: LinkedAccountInfo = {
        uid: user.uid,
        displayName: profile?.displayName || user.displayName,
        email: user.email,
        photoURL: profile?.photoURL || user.photoURL,
        dataAiHint: profile?.dataAiHint,
      };

      let updatedAccounts;
      if (existingAccount) {
        updatedAccounts = prev.map(acc => acc.uid === user.uid ? newAccountInfo : acc);
      } else {
        updatedAccounts = [...prev, newAccountInfo];
      }

      localStorage.setItem(LINKED_ACCOUNTS_STORAGE_KEY, JSON.stringify(updatedAccounts));
      console.log("[AuthContext] addAccountToSwitcherCb - Updated linked accounts in localStorage:", updatedAccounts.length);
      return updatedAccounts;
    });
  }, []);

  const removeAccountFromSwitcherCb = useCallback((uidToRemove: string) => {
    if (typeof window === 'undefined') return;
    console.log("[AuthContext] removeAccountFromSwitcherCb - Removing UID:", uidToRemove.substring(0,5));
    setLinkedAccountsState(prev => {
      const updatedAccounts = prev.filter(acc => acc.uid !== uidToRemove);
      localStorage.setItem(LINKED_ACCOUNTS_STORAGE_KEY, JSON.stringify(updatedAccounts));
      if (userRef.current?.uid === uidToRemove) {
        console.log("[AuthContext] removeAccountFromSwitcherCb - Current user removed, signing out.");
        signOutUserCb(false);
      }
      return updatedAccounts;
    });
    toast({title: "Cuenta Desvinculada", description: "La cuenta ha sido eliminada del selector."});
  }, [signOutUserCb, toast]);

  const signInWithGoogleCb = useCallback(async () => {
    if (typeof window === 'undefined') return;
    console.log("[AuthContext] signInWithGoogleCb - START");

    if (!isFirebaseInitialized()) {
      console.error("[AuthContext] signInWithGoogleCb - Firebase not initialized. Aborting Google sign-in.");
      toast({ title: "Error de Firebase", description: "Servicios de Firebase no disponibles. Revisa la configuración e inténtalo de nuevo.", variant: "destructive", duration: 7000 });
      setLoadingState(false); setIsSwitchingAccountState(false);
      return;
    }

    let auth: Auth;
    try {
        auth = getFirebaseAuth(); // Get instance and check
    } catch (e) {
        console.error("[AuthContext] signInWithGoogleCb - Failed to get FirebaseAuth instance:", e);
        toast({ title: "Error de Firebase Auth", description: "No se pudo obtener la instancia de autenticación.", variant: "destructive" });
        setLoadingState(false); setIsSwitchingAccountState(false);
        return;
    }

    // Clear any existing timeout first
    if (authTimeoutRef.current) { 
      clearTimeout(authTimeoutRef.current); 
      authTimeoutRef.current = null;
    }

    setIsSwitchingAccountState(true); 
    setLoadingState(true);
    
    // Set a timeout for the Google sign-in process specifically
    const signInTimeout = setTimeout(() => {
      console.warn("[AuthContext] signInWithGoogleCb - TIMEOUT! Auth process took too long.");
      setLoadingState(false); 
      setIsSwitchingAccountState(false);
      setErrorState(new Error("Google sign-in process timed out."));
      toast({title: "Tiempo de Espera Agotado", description:"El inicio de sesión con Google tardó demasiado. Inténtalo de nuevo.", variant:"destructive"});
    }, AUTH_TIMEOUT_DURATION);

    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUserFromResult = result.user;
      console.log("[AuthContext] signInWithGoogleCb - Google sign-in successful, UID:", firebaseUserFromResult.uid.substring(0,5));
      
      // Clear the sign-in timeout since we succeeded
      clearTimeout(signInTimeout);
      
      toast({title: "Inicio de Sesión con Google Exitoso"});
      
      // Don't set loading states here - let onAuthStateChanged handle the profile loading
      // The loading state will be managed by performFullUpdate
      
    } catch (e: any) {
      clearTimeout(signInTimeout);
      console.error("[AuthContext] signInWithGoogleCb - Error:", e);
      
      // Only show error if it's not a user cancellation
      if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
        toast({ title: "Error de Google", description: `No se pudo iniciar sesión con Google: ${e.message}. Código: ${e.code || 'N/A'}`, variant: "destructive"});
        setErrorState(e);
      }
      
      setIsSwitchingAccountState(false); 
      setLoadingState(false);
    }
  }, [toast]);

  const switchAccountCb = useCallback(async (targetUid: string) => {
    if (typeof window === 'undefined') return;
    console.log("[AuthContext] switchAccountCb - Attempting to switch to UID:", targetUid.substring(0,5));
    if (userRef.current?.uid === targetUid) {
      toast({title: "Cuenta Activa", description: "Ya estás en esta cuenta.", variant: "default"});
      console.log("[AuthContext] switchAccountCb - Already on target account.");
      return;
    }
    setIsSwitchingAccountState(true); setLoadingState(true);
    if (authTimeoutRef.current) { clearTimeout(authTimeoutRef.current); authTimeoutRef.current = null;}

    localStorage.setItem(TARGET_SWITCH_UID_KEY, targetUid);
    const targetAccount = linkedAccountsState.find(acc => acc.uid === targetUid);
    if (targetAccount && typeof targetAccount.email === 'string' && targetAccount.email.trim() !== "") {
      localStorage.setItem(TARGET_SWITCH_EMAIL_KEY, targetAccount.email);
    } else {
      localStorage.removeItem(TARGET_SWITCH_EMAIL_KEY);
    }
    await signOutUserCb(true); // isAccountSwitch = true
  }, [signOutUserCb, toast, linkedAccountsState]);

  const performFullUpdate = useCallback(async (currentUser: FirebaseUser | null) => {
    console.log(`[AuthContext] performFullUpdate - START for user: ${currentUser ? currentUser.uid.substring(0,5) : "null"}`);
    setLoadingState(true);
    setIsSwitchingAccountState(true);
    setErrorState(null);

    // Clear any existing timeout and set a new one
    if (authTimeoutRef.current) { 
      clearTimeout(authTimeoutRef.current); 
      authTimeoutRef.current = null; 
    }
    
    let timeoutCleared = false;
    authTimeoutRef.current = setTimeout(() => {
      if (!timeoutCleared && loadingStateRef.current) {
        console.warn(`[AuthContext] performFullUpdate - TIMEOUT! Process took too long for user: ${currentUser ? currentUser.uid.substring(0,5) : "null"}`);
        timeoutCleared = true;
        
        setLoadingState(false);
        setIsSwitchingAccountState(false);
        setErrorState(new Error("User profile and membership update timed out."));
        toast({
          title: "Error de Carga", 
          description: "La actualización del perfil tardó demasiado. Intenta refrescar la página.", 
          variant: "destructive"
        });
      }
    }, AUTH_TIMEOUT_DURATION);

    try {
      let resolvedProfile: UserProfile | null = null;
      if (currentUser) {
        console.log(`[AuthContext] performFullUpdate - Fetching profile for UID: ${currentUser.uid.substring(0,5)}`);
        resolvedProfile = await fetchUserProfile(currentUser);
        setUserProfileState(resolvedProfile);
        if (resolvedProfile) {
          console.log(`[AuthContext] performFullUpdate - Profile fetched for ${currentUser.uid.substring(0,5)}. Adding to switcher.`);
          addAccountToSwitcherCb(currentUser, resolvedProfile);
        } else {
          console.log(`[AuthContext] performFullUpdate - No profile found for ${currentUser.uid.substring(0,5)}.`);
        }
      } else {
        console.log("[AuthContext] performFullUpdate - No current user, setting profile to null.");
        setUserProfileState(null);
      }

      console.log(`[AuthContext] performFullUpdate - Determining membership for profile: ${resolvedProfile ? resolvedProfile.uid.substring(0,5) : "null"}`);
      await determineActiveMembershipCallback(resolvedProfile);
      console.log(`[AuthContext] performFullUpdate - Membership determined. Current activeStableId: ${activeStableIdStateRef.current ? activeStableIdStateRef.current.substring(0,5) : 'null'}, activeRole: ${activeRoleStateRef.current}`);

    } catch (e: any) {
      console.error(`[AuthContext] performFullUpdate - Error during update process for user ${currentUser ? currentUser.uid.substring(0,5) : "null"}:`, e);
      setUserProfileState(null); 
      await determineActiveMembershipCallback(null); 
      setErrorState(e);
      toast({
        title: "Error Interno", 
        description: `Ocurrió un error procesando tu información: ${e.message || 'Desconocido'}.`, 
        variant: "destructive"
      });
    } finally {
      // Ensure timeout is cleared and loading states are reset
      if (authTimeoutRef.current && !timeoutCleared) {
        clearTimeout(authTimeoutRef.current);
        authTimeoutRef.current = null;
        timeoutCleared = true;
        console.log(`[AuthContext] performFullUpdate - Timeout cleared in finally block for user: ${currentUser ? currentUser.uid.substring(0,5) : "null"}.`);
      }
      
      // Always reset loading states in finally block
      setLoadingState(false);
      setIsSwitchingAccountState(false);
      console.log(`[AuthContext] performFullUpdate - FINALLY. Loading states set to false for user: ${currentUser ? currentUser.uid.substring(0,5) : "null"}. loadingState: false, isSwitchingAccountState: false`);
    }
  }, [fetchUserProfile, determineActiveMembershipCallback, addAccountToSwitcherCb, toast]);


  const refreshUserProfileCb = useCallback(async () => {
    console.log("[AuthContext] refreshUserProfileCb - START. Current user UID:", userRef.current?.uid?.substring(0,5) || "N/A");
    if (typeof window !== 'undefined' && !userRef.current && !localStorage.getItem(TARGET_SWITCH_UID_KEY)) {
      console.log("[AuthContext] refreshUserProfileCb - Aborting: No user and no target switch UID.");
      setLoadingState(false); setIsSwitchingAccountState(false);
      return;
    }
    await performFullUpdate(userRef.current);
  }, [performFullUpdate]);

  const handleCreateNewStableCb = useCallback(async () => {
    const currentUser = userRef.current; const currentProfile = userProfileRef.current;
    if (!isFirebaseInitialized()) { toast({ title: "Error de Firebase", description: "Servicios no disponibles.", variant: "destructive" }); return; }
    if (!currentUser || !currentProfile || currentProfile.role !== 'jefe de cuadra') {
      toast({ title: "Acción no permitida", description: "Solo los jefes de cuadra pueden crear cuadras.", variant: "destructive" }); return;
    }
    if (currentProfile.stableId) {
      toast({ title: "Información", description: `Ya gestionas la cuadra "${currentProfile.stableName || currentProfile.stableId}". Para crear una nueva, primero debes abandonar la actual.`, variant: "default", duration: 7000}); return;
    }
    if (!newStableNameFormState.trim()) {
      toast({ title: "Error", description: "El nombre de la cuadra no puede estar vacío.", variant: "destructive" }); return;
    }
    setIsProcessingStableActionFormState(true);
    const db = getDb(); const generatedStableId = generateStableCode();
    const newStableData: Stable = {
      id: generatedStableId, name: newStableNameFormState.trim(), ownerId: currentUser.uid,
      members: [currentUser.uid], pendingMembers: [], createdAt: Timestamp.now(),
    };
    const userDocRef = doc(db, "users", currentUser.uid); const stableDocRef = doc(db, "stables", generatedStableId);
    try {
      const batch = writeBatch(db); batch.set(stableDocRef, newStableData);
      batch.update(userDocRef, { stableId: generatedStableId, stableName: newStableData.name, requestedStableId: null });
      await batch.commit();
      toast({ title: "Cuadra Creada", description: `La cuadra "${newStableData.name}" ha sido creada.` });
      setNewStableNameFormState("");
      await refreshUserProfileCb();
    } catch (error: any) {
      toast({ title: "Error al Crear Cuadra", description: `No se pudo crear la cuadra. ${error.message || ''} Código: ${error.code || 'N/A'}`, variant: "destructive" });
    } finally { setIsProcessingStableActionFormState(false); }
  }, [newStableNameFormState, toast, refreshUserProfileCb]);

  const handleJoinStableRequestCb = useCallback(async () => {
    const currentUser = userRef.current; const currentProfile = userProfileRef.current;
    if (!isFirebaseInitialized()) { toast({ title: "Error de Firebase", description: "Servicios no disponibles.", variant: "destructive" }); return; }
    if (!currentUser || !currentUser.uid || !currentProfile) {
      toast({ title: "Error", description: "Debes estar autenticado y tu perfil cargado.", variant: "destructive" }); return;
    }
    if (currentProfile.stableId) {
      toast({ title: "Información", description: "Ya perteneces a una cuadra.", variant: "default"}); return;
    }
    const codeToJoin = joinStableCodeFormState.trim();
    if (!codeToJoin || codeToJoin.length !== 14) {
      toast({ title: "Código Inválido", description: "El código debe tener 14 caracteres.", variant: "destructive" }); return;
    }
    if (currentProfile.requestedStableId === codeToJoin) {
      toast({ title: "Información", description: "Ya has solicitado unirte a esta cuadra.", variant: "default"}); return;
    }
    setIsProcessingStableActionFormState(true);
    const db = getDb();
    const dataForUserUpdate = { requestedStableId: codeToJoin, stableId: null, stableName: null };
    const pendingRequest: PendingMember = {
      userId: currentUser.uid, displayName: currentProfile.displayName || currentUser.email || "Usuario Desconocido",
      email: currentProfile.email || "No disponible", requestedAt: Timestamp.now(), requestedRole: currentProfile.role || 'jinete',
    };
    try {
      const stableDocRef = doc(db, "stables", codeToJoin);
      const stableDocSnap = await getDoc(stableDocRef);
      if (stableDocSnap.exists()) {
        const stableData = stableDocSnap.data() as Stable;
        const userDocRef = doc(db, "users", currentUser.uid);
        const batch = writeBatch(db);
        batch.update(stableDocRef, { pendingMembers: arrayUnion(pendingRequest) });
        batch.update(userDocRef, dataForUserUpdate);
        await batch.commit();
        toast({ title: "Solicitud Enviada", description: `Tu solicitud para unirte a "${stableData.name}" ha sido enviada.` });
        setJoinStableCodeFormState("");
        await refreshUserProfileCb();
      } else {
        toast({ title: "Error", description: "Código de cuadra no válido o la cuadra no existe.", variant: "destructive" });
      }
    } catch (error: any) {
      let userMessage = `No se pudo enviar la solicitud. ${error.message || ''}. Código: ${error.code || 'N/A'}.`;
      if (String(error.message).includes("permission-denied")) { userMessage = "Error de permisos al intentar unirse. Verifica las reglas de Firestore."; }
      toast({ title: "Error al Unirse", description: userMessage, variant: "destructive", duration: 9000 });
    } finally { setIsProcessingStableActionFormState(false); }
  }, [joinStableCodeFormState, toast, refreshUserProfileCb]);

  const handleLeaveStableCb = useCallback(async () => {
    const currentUser = userRef.current; const currentProfile = userProfileRef.current;
    if (!isFirebaseInitialized()) { toast({ title: "Error de Firebase", description: "Servicios no disponibles.", variant: "destructive" }); return; }
    if (!currentUser || !currentProfile || !currentProfile.stableId) {
      toast({ title: "Error", description: "No perteneces a ninguna cuadra.", variant: "destructive" }); return;
    }
    setIsProcessingStableActionFormState(true); const db = getDb();
    try {
      const batch = writeBatch(db); const stableDocRef = doc(db, "stables", currentProfile.stableId);
      const stableSnap = await getDoc(stableDocRef);
      if (stableSnap.exists()) {
        const stableData = stableSnap.data() as Stable;
        if (stableData.ownerId === currentUser.uid) {
          toast({title: "Advertencia: Dueño Abandonando", description: "Como dueño, considera eliminar la cuadra o transferir la propiedad.", variant:"default", duration: 10000});
        }
        batch.update(stableDocRef, { members: arrayRemove(currentUser.uid) });
      }
      const userDocRef = doc(db, "users", currentUser.uid);
      batch.update(userDocRef, { stableId: null, stableName: null, requestedStableId: null });
      await batch.commit();
      toast({ title: "Has abandonado la cuadra", description: `Ya no perteneces a ${currentProfile.stableName || 'la cuadra'}.`});
      await refreshUserProfileCb();
    } catch (error: any) {
      toast({ title: "Error", description: `No se pudo abandonar la cuadra. ${error.message || ''} Código: ${error.code || 'N/A'}`, variant: "destructive" });
    } finally { setIsProcessingStableActionFormState(false); }
  }, [toast, refreshUserProfileCb]);

  useEffect(() => {
    console.log("[AuthContext] Initial localStorage load effect - START");
    if (typeof window !== 'undefined') {
      const storedLinkedAccounts = localStorage.getItem(LINKED_ACCOUNTS_STORAGE_KEY);
      if (storedLinkedAccounts) {
        try {
          const parsedAccounts = JSON.parse(storedLinkedAccounts);
          setLinkedAccountsState(parsedAccounts);
        } catch (e) { console.error("[AuthContext] Error parsing linked accounts from localStorage", e); localStorage.removeItem(LINKED_ACCOUNTS_STORAGE_KEY); }
      }
    }
    setIsInitialClientLoadState(false);
    console.log("[AuthContext] Initial localStorage load effect - END. isInitialClientLoadState set to false.");
  }, []);

  useEffect(() => {
    if (isInitialClientLoadState) {
      console.log("[AuthContext] AuthStateChange Effect - SKIPPING (isInitialClientLoadState=true)");
      return () => {};
    }
    console.log("[AuthContext] AuthStateChange Effect - Setting up Firebase Auth listener. Current loadingStateRef:", loadingStateRef.current);

    if (!isFirebaseInitialized()) {
      console.error("[AuthContext] AuthStateChange Effect - CRITICAL: Firebase services not initialized. Check config.");
      setUserState(null); setUserProfileState(null); setActiveStableIdContextState(null); setActiveRoleContextState(null); setActiveStableNameContextState(null);
      setLoadingState(false); setIsSwitchingAccountState(false); setErrorState(new Error("Firebase not initialized. Check config."));
      toast({title: "Error Crítico de Firebase", description: "No se pudieron inicializar los servicios de Firebase.", variant: "destructive", duration: 15000});
      return;
    }

    console.log("[AuthContext] AuthStateChange Effect - Firebase is initialized.");
    if (authTimeoutRef.current) { clearTimeout(authTimeoutRef.current); authTimeoutRef.current = null; }
    const localTimeout = setTimeout(() => {
        if (loadingStateRef.current) {
            console.warn("[AuthContext] AuthStateChange Effect - TIMEOUT! Initial auth state check took too long. Current loadingStateRef:", loadingStateRef.current);
            setLoadingState(false);
            setIsSwitchingAccountState(false);
            setErrorState(new Error("Initial authentication check timed out."));
            toast({title: "Tiempo de Espera Agotado", description:"La verificación inicial de autenticación tardó demasiado.", variant:"destructive"});
        } else {
            console.log("[AuthContext] AuthStateChange Effect - TIMEOUT occurred, but loading was already false. No action.");
        }
    }, AUTH_TIMEOUT_DURATION);
    authTimeoutRef.current = localTimeout;


    let unsubscribeAuth = () => {};
    let auth: Auth | null = null;
    try {
      // Ensure app is initialized before getting auth
      getFirebaseApp(); // This will throw if app not init'd
      auth = getFirebaseAuth(); // Now safe to call
      console.log("[AuthContext] AuthStateChange Effect - Successfully got FirebaseAuth instance. Subscribing to onAuthStateChanged.");
    } catch (e) {
        if (authTimeoutRef.current === localTimeout) { clearTimeout(localTimeout); authTimeoutRef.current = null; }
        console.error("[AuthContext] AuthStateChange Effect - CRITICAL: Failed to get FirebaseAuth instance:", e);
        setErrorState(e); setUserState(null);
        setLoadingState(false); setIsSwitchingAccountState(false);
        toast({title: "Error Crítico de Firebase Auth", description: `No se pudo obtener el servicio de autenticación: ${(e as Error).message}`, variant: "destructive", duration: 15000});
        return; // Stop if auth instance cannot be obtained
    }

    // auth should be non-null here if we passed the try/catch
    unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (authTimeoutRef.current === localTimeout) { clearTimeout(localTimeout); authTimeoutRef.current = null; }
      console.log(`[AuthContext] onAuthStateChanged - Received Firebase user: ${firebaseUser ? firebaseUser.uid.substring(0,5) : "null"}. Current local userState: ${userRef.current ? userRef.current.uid.substring(0,5) : "null"}`);
      
      const previousUid = userRef.current?.uid;
      setUserState(firebaseUser); // This will trigger the Profile/Membership Effect

      if (firebaseUser && previousUid !== firebaseUser.uid) {
           console.log("[AuthContext] onAuthStateChanged - User changed or new login. Clearing target switch UID if any.");
           localStorage.removeItem(TARGET_SWITCH_UID_KEY);
      }
    }, (error) => {
        if (authTimeoutRef.current === localTimeout) { clearTimeout(localTimeout); authTimeoutRef.current = null; }
        console.error("[AuthContext] onAuthStateChanged - Error in listener:", error);
        setErrorState(error); setUserState(null);
        setLoadingState(false); setIsSwitchingAccountState(false);
    });

    return () => {
      console.log("[AuthContext] AuthStateChange Effect - Cleaning up Firebase Auth listener.");
      if (authTimeoutRef.current === localTimeout) { clearTimeout(localTimeout); authTimeoutRef.current = null; }
      unsubscribeAuth();
    }
  }, [isInitialClientLoadState, toast]); // Removed getFirebaseAuth from deps as it's now obtained inside

  useEffect(() => {
    if (isInitialClientLoadState) {
      console.log("[AuthContext] Profile/Membership Effect - SKIPPING (isInitialClientLoadState=true)");
      return;
    }
    console.log(`[AuthContext] Profile/Membership Effect - Triggered. User state: ${userState ? userState.uid.substring(0,5) : "null"}.`);
    performFullUpdate(userState);
  }, [userState, isInitialClientLoadState, performFullUpdate]);


  // Effect for handling navigation requests
  useEffect(() => {
    const pathToNavigate = navigateToPathState; // Current navigation request

    if (pathToNavigate && router && !justNavigatedRef.current) {
      const pathBeingProcessed = pathToNavigate; // Capture it
      setNavigateToPathInternal(null); // Clear request *immediately* to prevent re-processing this specific path
      console.log(`[AuthContext] Navigation Effect - Processing & cleared request for: ${pathBeingProcessed}. Current browser path: ${currentPath}`);

      if (currentPath === pathBeingProcessed) {
        console.log(`[AuthContext] Navigation Effect - Already on target path ${pathBeingProcessed}. No router.push needed.`);
        // justNavigatedRef.current = false; // Reset immediately if no navigation is actually performed
        // No, keep justNavigatedRef to allow the timeout to manage its reset, preventing rapid re-triggering.
        return;
      }

      console.log(`[AuthContext] Navigation Effect - Setting justNavigatedRef to TRUE for path: ${pathBeingProcessed}`);
      justNavigatedRef.current = true;

      try {
        console.log(`[AuthContext] Navigation Effect - router.push('${pathBeingProcessed}') called.`);
        router.push(pathBeingProcessed);
      } catch (e) {
        console.error(`[AuthContext] Navigation Effect - Error during router.push(${pathBeingProcessed}):`, e);
        justNavigatedRef.current = false; // Reset if push fails, allowing re-attempt
        // Potentially re-set navigateToPathState(pathBeingProcessed) if retries are desired, or handle error
      }
      // navigateToPathInternal is already null due to the call at the beginning of the block

      setTimeout(() => {
        justNavigatedRef.current = false;
        console.log(`[AuthContext] Navigation Effect - justNavigatedRef set to FALSE after timeout for path: ${pathBeingProcessed}.`);
      }, 1000); // Timeout remains to prevent rapid re-firing from other effects
    } else if (pathToNavigate && justNavigatedRef.current) {
      console.log(`[AuthContext] Navigation Effect - SKIPPED push to ${pathToNavigate} because justNavigatedRef.current is true. Will clear request.`);
      setNavigateToPathInternal(null); // Clear the request if it was skipped due to justNavigatedRef
    }
  }, [navigateToPathState, router, currentPath]);


  // Redirection Guard Effect
  useEffect(() => {
    const localUser = userRef.current;
    const localUserProfile = userProfileRef.current;
    const localActiveRole = activeRoleStateRef.current;
    const localActiveStableId = activeStableIdStateRef.current;
    const localRequestedStableId = localUserProfile?.requestedStableId || null;

    console.log(`[AuthContext] Redirection Guard - Evaluating. Path: ${currentPath}, Loading: ${loadingState}, InitialClient: ${isInitialClientLoadState}, NavPathState: ${navigateToPathState}, JustNav: ${justNavigatedRef.current}, SwitchingAcc: ${isSwitchingAccountState}`);

    if (loadingState || isInitialClientLoadState || navigateToPathState || justNavigatedRef.current || isSwitchingAccountState) {
      console.log(`[AuthContext] Redirection Guard - SKIPPING. Conditions: L:${loadingState}, IC:${isInitialClientLoadState}, NPS:${navigateToPathState}, JN:${justNavigatedRef.current}, ISA: ${isSwitchingAccountState}`);
      return;
    }
    console.log(`[AuthContext] Redirection Guard - PROCEEDING. User: ${localUser ? localUser.uid.substring(0,5) : 'null'}, Prof: ${localUserProfile ? 'OK' : 'NO'}, Role: ${localActiveRole}, Stable: ${localActiveStableId ? localActiveStableId.substring(0,5) : 'NO'}, ReqStable: ${localRequestedStableId ? localRequestedStableId.substring(0,5) : 'NO'}`);

    if (!localUser) {
      if (!AUTH_ROUTES.includes(currentPath) && currentPath !== '/' && currentPath !== '/profile') {
        console.log(`[AuthContext] Redirection Guard (No User) - Path: ${currentPath}. Requesting redirect to /login.`);
        setNavigateToPath('/login');
      } else { console.log(`[AuthContext] Redirection Guard (No User) - Path: ${currentPath}. No redirect needed.`);}
      return;
    }

    if (!localUserProfile || !localActiveRole) {
      if (currentPath !== '/profile' && !AUTH_ROUTES.includes(currentPath) && currentPath !== '/') {
        console.log(`[AuthContext] Redirection Guard (No Profile/Role) - Path: ${currentPath}. Requesting redirect to /profile.`);
        setNavigateToPath('/profile');
      } else { console.log(`[AuthContext] Redirection Guard (No Profile/Role) - Path: ${currentPath}. No redirect needed.`);}
      return;
    }

    if (!localActiveStableId && !localRequestedStableId) {
      if (currentPath !== '/profile' && !AUTH_ROUTES.includes(currentPath) && currentPath !== '/' && !currentPath.startsWith('/dashboard/calendario')) {
         console.log(`[AuthContext] Redirection Guard (Role, No Stable/Request) - Path: ${currentPath}. Requesting redirect to /profile.`);
         setNavigateToPath('/profile');
      } else { console.log(`[AuthContext] Redirection Guard (Role, No Stable/Request) - Path: ${currentPath}. No redirect needed.`);}
      return;
    }

    if (localActiveStableId) {
      const targetDashboardPath = localActiveRole === 'jefe de cuadra' ? '/dashboard/jefe' : '/dashboard/jinete';
      if ((currentPath === '/' || AUTH_ROUTES.includes(currentPath)) && !currentPath.startsWith('/dashboard/') && currentPath !== '/profile') {
        console.log(`[AuthContext] Redirection Guard (Role & Stable) - Path: ${currentPath}. Requesting redirect to ${targetDashboardPath}.`);
        setNavigateToPath(targetDashboardPath);
      } else { console.log(`[AuthContext] Redirection Guard (Role & Stable) - Path: ${currentPath}. No redirect needed to dashboard.`);}
      return;
    }

    if (!localActiveStableId && localRequestedStableId) {
        const baseDashboard = localActiveRole === 'jefe de cuadra' ? '/dashboard/jefe' : '/dashboard/jinete';
        if (currentPath.startsWith('/dashboard/') && currentPath !== baseDashboard && currentPath !== '/profile' && currentPath !== '/dashboard/calendario' ) {
            console.log(`[AuthContext] Redirection Guard (Pending, Wrong Dashboard: ${currentPath}) - Requesting redirect to ${baseDashboard}.`);
            setNavigateToPath(baseDashboard);
        } else if (!currentPath.startsWith('/dashboard/') && currentPath !== '/profile' && !AUTH_ROUTES.includes(currentPath) && currentPath !== '/') {
            console.log(`[AuthContext] Redirection Guard (Pending, Outside Dashboard/Profile: ${currentPath}) - Requesting redirect to /profile.`);
            setNavigateToPath('/profile');
        } else { console.log(`[AuthContext] Redirection Guard (Pending) - Path: ${currentPath}. No redirect needed.`);}
        return;
    }
    console.log("[AuthContext] Redirection Guard - No specific redirection condition met.");

  }, [
    loadingState, currentPath, navigateToPathState, isInitialClientLoadState,
    activeRoleState, activeStableIdState, userProfileState, // Added userProfileState as requestedStableId comes from it
    router, setNavigateToPath, isSwitchingAccountState // router is implicitly used by setNavigateToPath
  ]);

  useEffect(() => {
    if (userState && userProfileState && !loadingState && !isSwitchingAccountState) {
      if (typeof addAccountToSwitcherCb === 'function') {
        addAccountToSwitcherCb(userState, userProfileState);
      }
    }
  }, [userState, userProfileState, loadingState, isSwitchingAccountState, addAccountToSwitcherCb]);


  const contextValue = useMemo(() => ({
    user: userState, userProfile: userProfileState, loading: loadingState, error: errorState,
    refreshUserProfile: refreshUserProfileCb, signInWithGoogle: signInWithGoogleCb, signOut: () => signOutUserCb(false),
    activeStableId: activeStableIdState, activeRole: activeRoleState, activeStableName: activeStableNameState,
    activeSimulationRole: null,
    newStableNameState: newStableNameFormState, setNewStableNameState: setNewStableNameFormState,
    joinStableCodeState: joinStableCodeFormState, setJoinStableCodeState: setJoinStableCodeFormState,
    isProcessingStableAction: isProcessingStableActionFormState,
    handleCreateNewStable: handleCreateNewStableCb,
    handleJoinStableRequest: handleJoinStableRequestCb,
    handleLeaveStable: handleLeaveStableCb, setNavigateToPath,
    linkedAccounts: linkedAccountsState, addAccountToSwitcher: addAccountToSwitcherCb,
    removeAccountFromSwitcher: removeAccountFromSwitcherCb, switchAccount: switchAccountCb,
    isSwitchingAccount: isSwitchingAccountState,
  }), [
    userState, userProfileState, loadingState, errorState, refreshUserProfileCb, signInWithGoogleCb, signOutUserCb,
    activeStableIdState, activeRoleState, activeStableNameState,
    newStableNameFormState, joinStableCodeFormState, isProcessingStableActionFormState,
    handleCreateNewStableCb, handleJoinStableRequestCb, handleLeaveStableCb, setNavigateToPath,
    linkedAccountsState, addAccountToSwitcherCb, removeAccountFromSwitcherCb, switchAccountCb, isSwitchingAccountState
  ]);
  
  console.log(`[AuthContext] AuthProvider rendering Provider. Loading: ${loadingState}, User: ${userState?.uid?.substring(0,5)}, Profile: ${userProfileState?.uid?.substring(0,5)}`);
  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth debe usarse dentro de un AuthProvider");
  return context;
};

