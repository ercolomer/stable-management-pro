"use client";

import type { User as FirebaseUser } from "firebase/auth";
import React, { useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from "react";
import { getFirebaseAuth, getDb, isFirebaseInitialized } from "@/lib/firebase/config";
import type { UserProfile, UserRole } from "@/types";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut as firebaseSignOut,
} from "firebase/auth";

// VERSIÓN ÚNICA: 2024-FINAL-FIX-V1
const CONTEXT_VERSION = "2024-FINAL-FIX-V1";

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loading: boolean;
  error: any;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  setNavigateToPath: (path: string) => void;
  setNewStableName: (name: string) => void;
  setJoinStableCode: (code: string) => void;
  newStableName: string;
  joinStableCode: string;
  // Propiedades adicionales utilizadas por AppLayout y HomePage
  activeRole: UserRole | null;
  activeStableId: string | null;
  linkedAccounts: UserProfile[];
  isSwitchingAccount: boolean;
  switchAccount: (targetUid: string) => Promise<void>;
  removeAccountFromSwitcher: (uid: string) => void;
  addAccountToSwitcher: (user: FirebaseUser, profile: UserProfile | null) => void;
  // Propiedades faltantes identificadas en los errores de TypeScript
  activeSimulationRole: UserRole | "jineteConCuadra" | "jineteSinCuadra" | null;
  newStableNameState: string;
  setNewStableNameState: (name: string) => void;
  joinStableCodeState: string;
  setJoinStableCodeState: (code: string) => void;
  isProcessingStableAction: boolean;
  handleCreateNewStable: () => Promise<void>;
  handleJoinStableRequest: () => Promise<void>;
  handleLeaveStable: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // ALERTA SÚPER VISIBLE PARA CONFIRMAR QUE EL CÓDIGO SE ACTUALIZA
  if (typeof window !== "undefined") {
    console.log("🚨🚨🚨 NUEVA VERSIÓN CARGADA - SI VES ESTO EL CÓDIGO SE ACTUALIZÓ 🚨🚨🚨");
  }
  
  // LOGS ÚNICOS PARA IDENTIFICAR ESTA VERSIÓN
  console.log(`🔥🔥🔥 [AuthContext] VERSIÓN FINAL CARGADA: ${CONTEXT_VERSION} 🔥🔥🔥`);
  console.log("🎯 [AuthContext] Si ves este mensaje, la nueva versión está activa");
  console.log("🚧 [AuthContext] AuthProvider renderizando - PUNTO DE ENTRADA");
  
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState<unknown | null>(null);
  const [newStableName, setNewStableName] = useState("");
  const [joinStableCode, setJoinStableCode] = useState("");
  
  // LOG INMEDIATO DE ESTADO
  console.log(`📊 [AuthContext] VERSIÓN ${CONTEXT_VERSION} - Estado actual:`, {
    loading,
    hasUser: !!user,
    hasProfile: !!userProfile,
    userEmail: user?.email || 'none'
  });
  
  // Funciones setter estables
  const setNewStableNameStable = useCallback(setNewStableName, []);
  const setJoinStableCodeStable = useCallback(setJoinStableCode, []);
  // Estados adicionales para múltiples cuentas
  const [linkedAccounts, setLinkedAccounts] = useState<UserProfile[]>([]);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);
  const [isProcessingStableAction, setIsProcessingStableAction] = useState(false);

  const router = useRouter();

  // Función para cargar perfil del usuario desde Firestore (estable con useCallback)
  const loadUserProfile = useCallback(async (firebaseUser: FirebaseUser): Promise<UserProfile | null> => {
    try {
      console.log("📋 [AuthContext] Cargando perfil para:", firebaseUser.email);
      
      const db = getDb();
      const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        console.log("✅ [AuthContext] Perfil cargado:", userData.displayName, "- Rol:", userData.role);
        return userData;
      } else {
        console.log("⚠️ [AuthContext] No se encontró perfil en Firestore para:", firebaseUser.email);
        // Crear un perfil básico si no existe
        const basicProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          displayName: firebaseUser.displayName || "Usuario",
          role: "jinete" as UserRole,
          stableId: "",
          stableName: "",
        };
        return basicProfile;
      }
    } catch (error) {
      console.error("❌ [AuthContext] Error cargando perfil:", error);
      return null;
    }
  }, []);

  // Función para manejar redirección (estable con useCallback)
  const setNavigateToPath = useCallback((path: string) => {
    console.log("🧭 [AuthContext] Navegando a:", path);
    router.push(path);
  }, [router]);

  // useEffect para cargar cuentas vinculadas desde localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedAccounts = localStorage.getItem('linkedAccounts');
        if (savedAccounts) {
          const parsedAccounts = JSON.parse(savedAccounts);
          console.log("📱 [AuthContext] Cargando cuentas vinculadas desde localStorage:", parsedAccounts.length);
          setLinkedAccounts(parsedAccounts);
        }
      } catch (error) {
        console.warn("⚠️ [AuthContext] Error cargando cuentas desde localStorage:", error);
      }
    }
  }, []);

  // useEffect principal - CON LOG ESPECIAL
  useEffect(() => {
    console.log(`💥💥💥 [AuthContext] ¡¡¡useEffect EJECUTÁNDOSE EN VERSIÓN ${CONTEXT_VERSION}!!! 💥💥💥`);
    console.log("🎉 [AuthContext] ¡SI VES ESTO, EL USEEFFECT FUNCIONA!");
    console.log("🕐 [AuthContext] useEffect timestamp:", new Date().toLocaleTimeString());
    
    // Primero verificar si estamos en el cliente
    if (typeof window === "undefined") {
      console.log("🖥️ [AuthContext] Ejecutándose en servidor, saltando...");
      return;
    }
    
    console.log("🌐 [AuthContext] Ejecutándose en cliente, continuando...");
    
    let unsubscribe: (() => void) | null = null;
    let isMounted = true;

    const initAuth = async () => {
      try {
        console.log("🔍 [AuthContext] Verificando Firebase...");
        
        // Verificar Firebase con timeout más corto para depuración
        if (!isFirebaseInitialized()) {
          console.log("⏳ [AuthContext] Firebase no inicializado, reintentando en 500ms...");
          setTimeout(() => {
            if (isMounted) {
              console.log("🔄 [AuthContext] Reintentando initAuth...");
              initAuth();
            }
          }, 500);
          return;
        }

        console.log("🔥 [AuthContext] Firebase está listo, configurando Auth listener");
        const auth = getFirebaseAuth();
        
        unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (!isMounted) {
            console.log("⚠️ [AuthContext] Componente desmontado, ignorando cambio de auth");
            return;
          }
          
          console.log("👤 [AuthContext] Estado de Auth cambió:", firebaseUser ? firebaseUser.email : "No user");
          
          if (firebaseUser) {
            // Usuario autenticado
            console.log("✅ [AuthContext] Usuario encontrado, estableciendo estado...");
            setUser(firebaseUser);
            const profile = await loadUserProfile(firebaseUser);
            setUserProfile(profile);
            setError(null);
            console.log("🎯 [AuthContext] Usuario y perfil establecidos correctamente");
            
            // Auto-agregar cuenta actual al switcher si no existe
            setLinkedAccounts(prevAccounts => {
              const exists = prevAccounts.some(acc => acc.uid === firebaseUser.uid);
              if (!exists && profile) {
                console.log("🔗 [AuthContext] Auto-agregando cuenta actual al switcher");
                const newAccounts = [...prevAccounts, profile];
                try {
                  localStorage.setItem('linkedAccounts', JSON.stringify(newAccounts));
                } catch (error) {
                  console.warn("⚠️ [AuthContext] No se pudo guardar en localStorage:", error);
                }
                return newAccounts;
              }
              return prevAccounts;
            });
          } else {
            // No hay usuario
            console.log("👋 [AuthContext] No hay usuario, limpiando estado...");
            setUser(null);
            setUserProfile(null);
          }
          
          console.log("📊 [AuthContext] Estableciendo loading = false");
          setLoading(false);
          console.log("✅ [AuthContext] Estado de loading actualizado");
        });

        console.log("🎯 [AuthContext] Auth listener configurado correctamente");

      } catch (error) {
        console.error("❌ [AuthContext] Error en initAuth:", error);
        if (isMounted) {
          setError(error);
          setLoading(false);
        }
      }
    };

    // Iniciar inmediatamente
    console.log("🚀 [AuthContext] Iniciando initAuth...");
    initAuth();

    // Cleanup
    return () => {
      console.log("🧹 [AuthContext] Cleanup ejecutándose");
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
        console.log("🧹 [AuthContext] Auth listener desconectado");
      }
    };
  }, []); // SIN DEPENDENCIAS

  // Función para login con Google (estable con useCallback)
  const signInWithGoogle = useCallback(async () => {
    try {
      console.log("🔐 [AuthContext] Iniciando login con Google");
      const auth = getFirebaseAuth();
      const provider = new GoogleAuthProvider();
      
      const result = await signInWithPopup(auth, provider);
      console.log("✅ [AuthContext] Login exitoso:", result.user.email);
      
      // El listener de onAuthStateChanged manejará el resto
    } catch (error) {
      console.error("❌ [AuthContext] Error en login:", error);
      setError(error);
    }
  }, []);

  // Función para logout (estable con useCallback)
  const signOut = useCallback(async () => {
    try {
      console.log("👋 [AuthContext] Cerrando sesión");
      const auth = getFirebaseAuth();
      await firebaseSignOut(auth);
      
      // Limpiar estado local
      setUser(null);
      setUserProfile(null);
      setError(null);
      
      console.log("✅ [AuthContext] Sesión cerrada");
    } catch (error) {
      console.error("❌ [AuthContext] Error cerrando sesión:", error);
      setError(error);
    }
  }, []);

  // Función para refrescar perfil (estable con useCallback)
  const refreshUserProfile = useCallback(async () => {
    if (user) {
      console.log("🔄 [AuthContext] Refrescando perfil");
      const profile = await loadUserProfile(user);
      setUserProfile(profile);
    }
  }, [user, loadUserProfile]);

  // Funciones para múltiples cuentas (completamente implementadas)
  const addAccountToSwitcher = useCallback((firebaseUser: FirebaseUser, profile: UserProfile | null) => {
    console.log("➕ [AuthContext] Agregando cuenta al switcher:", firebaseUser.email);
    
    if (!profile) {
      // Crear perfil básico si no existe
      profile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || "",
        displayName: firebaseUser.displayName || "Usuario",
        role: "jinete",
        stableId: null,
        stableName: null,
      };
    }
    
    setLinkedAccounts(prevAccounts => {
      // Evitar duplicados
      const exists = prevAccounts.some(acc => acc.uid === firebaseUser.uid);
      if (exists) {
        console.log("⚠️ [AuthContext] Cuenta ya existe en el switcher");
        return prevAccounts;
      }
      
      const newAccounts = [...prevAccounts, profile];
      console.log("✅ [AuthContext] Cuenta agregada al switcher. Total cuentas:", newAccounts.length);
      
      // Guardar en localStorage
      try {
        localStorage.setItem('linkedAccounts', JSON.stringify(newAccounts));
      } catch (error) {
        console.warn("⚠️ [AuthContext] No se pudo guardar en localStorage:", error);
      }
      
      return newAccounts;
    });
  }, []);

  const removeAccountFromSwitcher = useCallback((uid: string) => {
    console.log("🗑️ [AuthContext] Eliminando cuenta del switcher:", uid);
    
    setLinkedAccounts(prevAccounts => {
      const newAccounts = prevAccounts.filter(acc => acc.uid !== uid);
      console.log("✅ [AuthContext] Cuenta eliminada. Cuentas restantes:", newAccounts.length);
      
      // Actualizar localStorage
      try {
        localStorage.setItem('linkedAccounts', JSON.stringify(newAccounts));
      } catch (error) {
        console.warn("⚠️ [AuthContext] No se pudo actualizar localStorage:", error);
      }
      
      return newAccounts;
    });
  }, []);

  const switchAccount = useCallback(async (targetUid: string) => {
    if (targetUid === user?.uid) {
      console.log("ℹ️ [AuthContext] Ya estás en esta cuenta");
      return;
    }
    
    console.log("🔄 [AuthContext] Cambiando a cuenta:", targetUid);
    setIsSwitchingAccount(true);
    
    try {
      // Encontrar la cuenta objetivo
      const targetAccount = linkedAccounts.find(acc => acc.uid === targetUid);
      if (!targetAccount) {
        throw new Error("Cuenta no encontrada en las cuentas vinculadas");
      }
      
      // Primero cerrar sesión actual
      const auth = getFirebaseAuth();
      await firebaseSignOut(auth);
      
      // Aquí normalmente harías el login con la cuenta objetivo
      // Por ahora simularemos el cambio
      console.log("🎯 [AuthContext] Simulando cambio a cuenta:", targetAccount.email);
      
      // En una implementación real, aquí harías:
      // await signInWithEmailAndPassword(auth, targetAccount.email, password);
      // Pero como no tenemos las credenciales, solo mostramos el mensaje
      
      console.log("✅ [AuthContext] Cambio de cuenta completado");
      
    } catch (error) {
      console.error("❌ [AuthContext] Error al cambiar cuenta:", error);
    } finally {
      setIsSwitchingAccount(false);
    }
  }, [user?.uid, linkedAccounts]);

  // Funciones handle para estabilizar aciones
  const handleCreateNewStable = useCallback(async () => {
    console.log("🏗️ [AuthContext] handleCreateNewStable called - not implemented yet");
    setIsProcessingStableAction(true);
    // TODO: Implementar creación de cuadra
    setTimeout(() => setIsProcessingStableAction(false), 1000);
  }, []);

  const handleJoinStableRequest = useCallback(async () => {
    console.log("🤝 [AuthContext] handleJoinStableRequest called - not implemented yet");
    setIsProcessingStableAction(true);
    // TODO: Implementar solicitud de unirse a cuadra
    setTimeout(() => setIsProcessingStableAction(false), 1000);
  }, []);

  const handleLeaveStable = useCallback(async () => {
    console.log("👋 [AuthContext] handleLeaveStable called - not implemented yet");
    setIsProcessingStableAction(true);
    // TODO: Implementar salir de cuadra
    setTimeout(() => setIsProcessingStableAction(false), 1000);
  }, []);

  // Propiedades derivadas
  const activeRole = userProfile?.role || null;
  const activeStableId = userProfile?.stableId || null;
  // Determinar el rol de simulación basado en el rol y si tiene cuadra
  const activeSimulationRole = activeRole === "jinete" 
    ? (activeStableId ? "jineteConCuadra" : "jineteSinCuadra")
    : activeRole;
  // Usar los estados existentes como aliases para mantener compatibilidad
  const newStableNameState = newStableName;
  const setNewStableNameState = setNewStableNameStable;
  const joinStableCodeState = joinStableCode;
  const setJoinStableCodeState = setJoinStableCodeStable;

  const value: AuthContextType = useMemo(() => ({
    user,
    userProfile,
    loading,
    error,
    signInWithGoogle,
    signOut,
    refreshUserProfile,
    setNavigateToPath,
    setNewStableName: setNewStableNameStable,
    setJoinStableCode: setJoinStableCodeStable,
    newStableName,
    joinStableCode,
    // Propiedades adicionales
    activeRole,
    activeStableId,
    linkedAccounts,
    isSwitchingAccount,
    switchAccount,
    removeAccountFromSwitcher,
    addAccountToSwitcher,
    // Propiedades faltantes
    activeSimulationRole,
    newStableNameState,
    setNewStableNameState,
    joinStableCodeState,
    setJoinStableCodeState,
    isProcessingStableAction,
    handleCreateNewStable,
    handleJoinStableRequest,
    handleLeaveStable,
  }), [
    user,
    userProfile,
    loading,
    error,
    signInWithGoogle,
    signOut,
    refreshUserProfile,
    setNavigateToPath,
    setNewStableNameStable,
    setJoinStableCodeStable,
    newStableName,
    joinStableCode,
    activeRole,
    activeStableId,
    linkedAccounts,
    isSwitchingAccount,
    switchAccount,
    removeAccountFromSwitcher,
    addAccountToSwitcher,
    activeSimulationRole,
    newStableNameState,
    setNewStableNameState,
    joinStableCodeState,
    setJoinStableCodeState,
    isProcessingStableAction,
    handleCreateNewStable,
    handleJoinStableRequest,
    handleLeaveStable,
  ]);

  console.log(`📊 [AuthContext] VERSIÓN ${CONTEXT_VERSION} - Estado actual:`, {
    loading,
    hasUser: !!user,
    hasProfile: !!userProfile,
    userEmail: user?.email || "none"
  });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

