"use client";

import { useEffect, useState, useMemo, useCallback } from "react"; 
import { useAuth } from "@/contexts/auth-context";
import { getDb } from "@/lib/firebase/config"; 
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, Timestamp, writeBatch, collection, query, where, getDocs } from "firebase/firestore"; 
import type { UserProfile, Stable, PendingMember } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Users, AlertCircle, UserCheck, UserX, Mail, CalendarClock, Check, X, UserMinus } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { useTranslations } from "next-intl";
import StableWrapper from "@/components/stable-wrapper";

export default function GestionJinetesPage() {
  const db = getDb(); 
  const { userProfile, loading: authLoading, refreshUserProfile, activeStableId } = useAuth();
  const { toast } = useToast();
  const t = useTranslations("common");

  // Estado para evitar errores de DOM durante desmontaje
  const [isMounted, setIsMounted] = useState(true);

  const [jinetesEnCuadra, setJinetesEnCuadra] = useState<UserProfile[]>([]);
  const [solicitudesPendientes, setSolicitudesPendientes] = useState<PendingMember[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true); 
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [expelConfirmationText, setExpelConfirmationText] = useState("");
  const [jineteToExpel, setJineteToExpel] = useState<UserProfile | null>(null);
  const [isExpelDialogOpen, setIsExpelDialogOpen] = useState(false);

  const fetchJinetesYSolicitudes = useCallback(async () => {
    if (!isMounted) return; // Guard temprano
    
    const currentStableId = activeStableId;

    if (!currentStableId) {
      if (!authLoading && isMounted) { 
          setError("No estás asignado a ninguna cuadra activa.");
          setJinetesEnCuadra([]);
          setSolicitudesPendientes([]);
      }
      if (isMounted) setIsLoadingData(false);
      return;
    }
    
    if (isMounted) {
      setIsLoadingData(true);
      setError(null);
    }
    
    console.log(`[DEBUG] GestionJinetesPage (Jefe) - fetchJinetesYSolicitudes Diagnostics:`);
    console.log(`  Authenticated User UID (request.auth.uid): ${userProfile?.uid || 'N/A (profile not loaded)'}`);
    console.log(`  Querying for Stable ID (currentStableId): ${currentStableId}`);
    
    try {
      console.log("GestionJinetesPage (Jefe) - Fetching data from Firestore.");
      console.log("GestionJinetesPage (Jefe) - Querying stable document:", { path: `stables/${currentStableId}` });
      const stableDocRef = doc(db, "stables", currentStableId);
      const stableDocSnap = await getDoc(stableDocRef);

      if (!stableDocSnap.exists()) {
        if (isMounted) {
          setError("No se encontró la cuadra activa.");
          setJinetesEnCuadra([]);
          setSolicitudesPendientes([]);
          setIsLoadingData(false);
        }
        return;
      }

      const stableData = stableDocSnap.data() as Stable;
      if (isMounted) setSolicitudesPendientes(stableData.pendingMembers || []);

      const ownerId = stableData.ownerId; 
      const jineteIdsAprobados = stableData.members.filter(memberId => memberId !== ownerId);
      
      if (jineteIdsAprobados.length > 0) {
        console.log("GestionJinetesPage (Jefe) - Querying users collection for members:", { uids: jineteIdsAprobados });
        const perfilesPromises = jineteIdsAprobados.map(id => getDoc(doc(db, "users", id)));
        const perfilesDocs = await Promise.all(perfilesPromises);
        const fetchedJinetes = perfilesDocs
          .filter(docSnap => docSnap.exists())
          .map(docSnap => docSnap.data() as UserProfile);
        if (isMounted) setJinetesEnCuadra(fetchedJinetes);
      } else {
        if (isMounted) setJinetesEnCuadra([]);
      }
    } catch (err: any) {
      console.error("Error al cargar jinetes y solicitudes:", err);
      if (isMounted) {
        setError(`No se pudo cargar la lista de jinetes y/o solicitudes. ${err.message || ''} Código: ${err.code || 'N/A'}`);
        if(toast) toast({ title: "Error de Carga", description: `No se pudo cargar la lista. Código: ${err.code || 'N/A'}. Mensaje: ${err.message || ''}`, variant: "destructive", duration: 7000});
      }
    } finally {
      if (isMounted) setIsLoadingData(false);
    }
  }, [activeStableId, authLoading, userProfile, toast, db, isMounted]); 

  useEffect(() => {
    setIsMounted(true);
    
    if (authLoading || !isMounted) return; 

    if (!userProfile || userProfile.role !== "jefe de cuadra") {
      if (isMounted) {
        setError("Acceso denegado. Debes ser jefe de cuadra.");
        setIsLoadingData(false);
      }
      return;
    }
    if (userProfile.role === "jefe de cuadra" && !activeStableId) {
      if (isMounted) {
        setError("Jefe de cuadra sin cuadra activa. Ve a tu perfil para crear o seleccionar una cuadra.");
        setIsLoadingData(false);
      }
      return;
    }
    
    fetchJinetesYSolicitudes();
    
    return () => {
      setIsMounted(false);
    };
  }, [userProfile, authLoading, fetchJinetesYSolicitudes, activeStableId, isMounted]); 

  const handleManageRequest = async (pendingJinete: PendingMember, approve: boolean) => {
    if (!isMounted) return; // Guard temprano
    
    const currentStableId = activeStableId;
    if (!currentStableId || !userProfile) return;

    setIsProcessing(true);
    try {
        const batch = writeBatch(db);
        const stableRef = doc(db, "stables", currentStableId);
        const userRef = doc(db, "users", pendingJinete.userId);

        const stableDocSnap = await getDoc(stableRef); 
        if (!stableDocSnap.exists()) throw new Error("Cuadra no encontrada para actualizar.");
        const stableData = stableDocSnap.data() as Stable;
        const updatedPendingMembers = stableData.pendingMembers?.filter(p => p.userId !== pendingJinete.userId) || [];

        if (approve) {
          batch.update(stableRef, {
            members: arrayUnion(pendingJinete.userId),
            pendingMembers: updatedPendingMembers
          });
          batch.update(userRef, {
              stableId: currentStableId,
              stableName: stableData.name, 
              requestedStableId: null, 
              role: pendingJinete.requestedRole || 'jinete' 
          });
          await batch.commit();
          
          if (isMounted) {
            const userDocSnap = await getDoc(userRef); 
            if(userDocSnap.exists()){
                  setJinetesEnCuadra(prev => [...prev, userDocSnap.data() as UserProfile]);
            }
            if(toast) toast({ title: "Jinete Aprobado", description: `${pendingJinete.displayName || 'El jinete'} ha sido añadido.` });
          }
        } else { 
          batch.update(stableRef, {
            pendingMembers: updatedPendingMembers
          });
          batch.update(userRef, {
              requestedStableId: null 
          });
          await batch.commit();
          if(isMounted && toast) toast({ title: "Solicitud Rechazada", description: `La solicitud de ${pendingJinete.displayName || 'el jinete'} ha sido rechazada.` });
        }
        if (isMounted) setSolicitudesPendientes(updatedPendingMembers);
    } catch (err: any) {
      console.error("Error al gestionar solicitud:", err);
      if(isMounted && toast) toast({ title: "Error", description: `No se pudo procesar la solicitud. ${err.message || ''} Código: ${err.code || 'N/A'}`, variant: "destructive" });
    } finally {
      if (isMounted) setIsProcessing(false);
    }
  };

  const handleOpenExpelDialog = (jinete: UserProfile) => {
    if (!isMounted) return;
    
    setJineteToExpel(jinete);
    setExpelConfirmationText("");
    setIsExpelDialogOpen(true);
  };

  const handleExpelJinete = async () => {
    if (!isMounted) return; // Guard temprano
    
    const currentStableId = activeStableId;
    if (!jineteToExpel || !currentStableId || !userProfile || expelConfirmationText.toLowerCase() !== "echar") {
      if(isMounted && toast) toast({ title: "Error", description: "Texto de confirmación incorrecto o ID de cuadra no encontrado.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    try {
      const batch = writeBatch(db);
      const stableRef = doc(db, "stables", currentStableId);
      const userRef = doc(db, "users", jineteToExpel.uid);

      batch.update(stableRef, {
        members: arrayRemove(jineteToExpel.uid)
      });
      batch.update(userRef, {
          stableId: null,
          stableName: null,
          requestedStableId: null 
      });
      await batch.commit();

      if (isMounted) {
        setJinetesEnCuadra(prev => prev.filter(j => j.uid !== jineteToExpel.uid));
        if(toast) toast({ title: "Jinete Expulsado", description: `${jineteToExpel.displayName} ha sido expulsado de la cuadra.` });
        setIsExpelDialogOpen(false);
      }
    } catch (err: any) {
      console.error("Error al expulsar jinete:", err);
      if(isMounted && toast) toast({ title: "Error", description: `No se pudo expulsar al jinete. ${err.message || ''} Código: ${err.code || 'N/A'}`, variant: "destructive" });
    } finally {
      if (isMounted) {
        setIsProcessing(false);
        setIsExpelDialogOpen(false);
      }
    }
  };

  // Protección temprana contra renderizado durante desmontaje
  if (!isMounted) {
    return null;
  }

  if (authLoading || !activeStableId) { 
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!activeStableId && !authLoading) {
     return (
        <StableWrapper>
          <Alert variant="default" className="max-w-lg mx-auto">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No tienes una cuadra activa</AlertTitle>
              <AlertDescription>
              Por favor, <Link href="/profile" className="text-primary underline">crea o selecciona una cuadra</Link> para gestionar jinetes.
              </AlertDescription>
          </Alert>
        </StableWrapper>
    );
  }
  
  if (error && !isLoadingData) { 
    return (
      <StableWrapper>
        <Alert variant="destructive" className="max-w-lg mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </StableWrapper>
    );
  }
  
  return (
    <StableWrapper className="container mx-auto py-8 space-y-8">
      {isLoadingData && <div className="flex h-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}
      
      {!isLoadingData && solicitudesPendientes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CalendarClock className="h-6 w-6 text-amber-600" />Solicitudes Pendientes</CardTitle>
            <CardDescription>Usuarios que han solicitado unirse a tu cuadra.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Email</TableHead><TableHead>Rol Solicitado</TableHead><TableHead>Fecha Solicitud</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
              <TableBody>
                {solicitudesPendientes.map((solicitud) => (
                  <TableRow key={solicitud.userId}>
                    <TableCell className="font-medium">{solicitud.displayName || "N/D"}</TableCell>
                    <TableCell>{solicitud.email || "N/D"}</TableCell>
                    <TableCell className="capitalize">{solicitud.requestedRole?.replace('_', ' ') || "jinete"}</TableCell>
                    <TableCell>{solicitud.requestedAt instanceof Timestamp ? format(solicitud.requestedAt.toDate(), "dd/MM/yyyy HH:mm", { locale: es }) : (solicitud.requestedAt ? format(new Date(solicitud.requestedAt), "dd/MM/yyyy HH:mm", {locale: es}) : "N/A")}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => handleManageRequest(solicitud, true)} disabled={isProcessing} title="Aprobar"><UserCheck className="h-5 w-5 text-green-600" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleManageRequest(solicitud, false)} disabled={isProcessing} title="Rechazar"><UserX className="h-5 w-5 text-red-600" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          {isProcessing && solicitudesPendientes.length > 0 && <CardFooter><Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" /></CardFooter>}
        </Card>
      )}

      {!isLoadingData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-6 w-6" />Jinetes en la Cuadra</CardTitle>
            <CardDescription>Miembros actuales de tu cuadra. El código para unirse es: <strong className="font-mono text-primary">{activeStableId}</strong></CardDescription>
          </CardHeader>
          <CardContent>
            {jinetesEnCuadra.length === 0 && !isLoadingData ? (
              <p className="text-muted-foreground">No hay jinetes en tu cuadra actualmente.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">Avatar</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Correo Electrónico</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jinetesEnCuadra.map((jinete) => (
                    <TableRow key={jinete.uid}>
                      <TableCell>
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={jinete.photoURL || `https://placehold.co/40x40.png?text=${jinete.displayName ? jinete.displayName.substring(0,2).toUpperCase() : 'J'}`} alt={jinete.displayName || "Avatar"} data-ai-hint={jinete.dataAiHint || "person portrait"} />
                          <AvatarFallback>{jinete.displayName ? jinete.displayName.substring(0,2).toUpperCase() : 'J'}</AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">{jinete.displayName || "N/D"}</TableCell>
                      <TableCell>{jinete.email || "N/D"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenExpelDialog(jinete)} disabled={isProcessing} title="Expulsar Jinete">
                            <UserMinus className="h-5 w-5 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
          {isProcessing && jinetesEnCuadra.length > 0 && <CardFooter><Loader2 className="h-5 w-5 animate-spin text-primary mx-auto" /></CardFooter>}
        </Card>
      )}

      {jineteToExpel && (
        <AlertDialog open={isExpelDialogOpen} onOpenChange={(open) => { setIsExpelDialogOpen(open); if (!open) setJineteToExpel(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Expulsar a {jineteToExpel.displayName}?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción es irreversible. Para confirmar, escribe "<b>echar</b>" abajo.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-2">
              <Label htmlFor="expelConfirmText" className="sr-only">Confirmar</Label>
              <Input 
                id="expelConfirmText"
                type="text"
                value={expelConfirmationText}
                onChange={(e) => setExpelConfirmationText(e.target.value)}
                placeholder='Escribe "echar"'
                disabled={isProcessing}
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isProcessing} onClick={() => { setIsExpelDialogOpen(false); setJineteToExpel(null); }}>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleExpelJinete} 
                disabled={isProcessing || expelConfirmationText.toLowerCase() !== "echar"}
                className="bg-destructive hover:bg-destructive/90"
              >
                <Loader2 className={`mr-2 h-4 w-4 animate-spin ${isProcessing ? 'opacity-100' : 'opacity-0 w-0 mr-0'}`} />
                Expulsar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </StableWrapper>
  );
}
