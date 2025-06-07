"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { getDb } from "@/lib/firebase/config";
import { collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc, serverTimestamp, Timestamp, getDoc } from "firebase/firestore";
import type { HorseAssignment, UserProfile, Stable, Horse } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, Edit2, Trash2, CalendarIcon, AlertCircle, CheckCircle2, Circle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { useTranslations } from '@/hooks/use-translations';

// Icono de caballo personalizado
const CustomHorseIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3.5 21h17M5.5 21V11L12 3l6.5 8v10M12 11V3"/>
    <path d="M7.5 11a2.5 2.5 0 0 1-5 0V8.5a2.5 2.5 0 0 1 5 0V11Z"/>
    <path d="M16.5 11a2.5 2.5 0 0 1 5 0V8.5a2.5 2.5 0 0 1-5 0V11Z"/>
  </svg>
);


export default function JineteGestionMontasPage() {
  const db = getDb();
  const { userProfile, loading: authLoading, activeStableId } = useAuth();
  const { toast } = useToast();

  // Traducciones
  const t = useTranslations('common');
  const tRides = useTranslations('rides');

  const [jinetesEnCuadra, setJinetesEnCuadra] = useState<UserProfile[]>([]);
  const [horsesInStable, setHorsesInStable] = useState<Pick<Horse, 'id' | 'name' | 'stableId'>[]>([]);
  const [assignments, setAssignments] = useState<HorseAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [jineteId, setJineteId] = useState<string | undefined>(undefined);
  const [horseName, setHorseName] = useState<string | undefined>(undefined);
  const [assignmentDate, setAssignmentDate] = useState<Date | undefined>(new Date());
  const [notes, setNotes] = useState("");
  const [editingAssignment, setEditingAssignment] = useState<HorseAssignment | null>(null);
  

 const normalizeAssignmentDates = (assignment: any): HorseAssignment => {
    // Helper para convertir Timestamp o cualquier cosa a Date o undefined
    const toDateOrUndefined = (field: any): Date | undefined => {
      if (!field) return undefined;
      if (field instanceof Timestamp) return field.toDate();
      // Intenta crear una Date; si no es válida, devuelve undefined
      const d = new Date(field);
      return isNaN(d.getTime()) ? undefined : d;
    };

    return {
      ...assignment,
      id: assignment.id as string, // Asegurar que el id sea string
      date: toDateOrUndefined(assignment.date) as Date, // Forzamos a Date, asumiendo que siempre habrá una fecha válida aquí
      createdAt: toDateOrUndefined(assignment.createdAt),
      updatedAt: toDateOrUndefined(assignment.updatedAt),
      completedAt: toDateOrUndefined(assignment.completedAt),
      // Asegurar que otros campos tengan el tipo correcto o un valor por defecto
      stableId: assignment.stableId as string,
      jineteId: assignment.jineteId as string,
      horseName: assignment.horseName as string,
      notes: typeof assignment.notes === 'string' ? assignment.notes : null,
      isCompleted: typeof assignment.isCompleted === 'boolean' ? assignment.isCompleted : false,
      completedBy: typeof assignment.completedBy === 'string' ? assignment.completedBy : null,
    };
  };

  useEffect(() => {
    if (authLoading) return;

    const stableIdToUse = activeStableId;

    if (!stableIdToUse) {
      setError(tRides('notAssignedToStable'));
      setIsLoading(false);
      return;
    }
    if (userProfile && userProfile.role !== "jinete") {
       setError(tRides('accessDenied'));
       setIsLoading(false);
       return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      console.log(`[DEBUG] JineteGestionMontasPage - fetchData Diagnostics:`);
      console.log(`  Authenticated User UID (request.auth.uid): ${userProfile?.uid || 'N/A (profile not loaded)'}`);
      console.log(`  Querying for Stable ID (stableIdToUse): ${stableIdToUse}`);
        
      console.log(`GestionMontasPage (Jinete) - Fetching data for stableId: ${stableIdToUse}`);
        
      try {
        if (stableIdToUse) {
          console.log("GestionMontasPage (Jinete) - Fetching data from Firestore.");
          const stableDocRef = doc(db, "stables", stableIdToUse);
          console.log("GestionMontasPage (Jinete) - Querying stable document:", { path: `stables/${stableIdToUse}` });
          const stableDocSnap = await getDoc(stableDocRef);
          if (!stableDocSnap.exists()) throw new Error("Cuadra no encontrada.");
          const stableData = stableDocSnap.data() as Stable;
          const memberIds = stableData.members; 
          
          if (memberIds.length > 0) {
            console.log("GestionMontasPage (Jinete) - Querying users collection for members:", { uids: memberIds });
            const usersQuery = query(collection(db, "users"), where("uid", "in", memberIds));
            const usersSnapshot = await getDocs(usersQuery);
            setJinetesEnCuadra(usersSnapshot.docs.map(d => d.data() as UserProfile));
          } else {
            setJinetesEnCuadra([]);
          }
          
          console.log("GestionMontasPage (Jinete) - Querying horses collection:", { collection: "horses", where: `stableId == ${stableIdToUse}` });
          const horsesQuery = query(collection(db, "horses"), where("stableId", "==", stableIdToUse));
          const horsesSnapshot = await getDocs(horsesQuery);
          setHorsesInStable(horsesSnapshot.docs.map(d => ({ id: d.id, name: d.data().name, stableId: d.data().stableId } as Pick<Horse, 'id' | 'name' | 'stableId'>)));
          
          console.log("GestionMontasPage (Jinete) - Querying horseAssignments collection:", { collection: "horseAssignments", where: `stableId == ${stableIdToUse}` });
          const assignmentsQuery = query(collection(db, "horseAssignments"), where("stableId", "==", stableIdToUse));
          const assignmentsSnapshot = await getDocs(assignmentsQuery);
          const fetchedAssignments = assignmentsSnapshot.docs
            .map(d => normalizeAssignmentDates({id: d.id, ...d.data()} as HorseAssignment))
            .sort((a,b) => {
              const dateA = a.date instanceof Timestamp ? a.date.toDate() : a.date;
              const dateB = b.date instanceof Timestamp ? b.date.toDate() : b.date;
              return new Date(dateA).getTime() - new Date(dateB).getTime();
            });
          setAssignments(fetchedAssignments);
        } else {
            setJinetesEnCuadra([]);
            setHorsesInStable([]);
            setAssignments([]);
        }
      } catch (err: any) {
        console.error("Error al cargar datos:", err);
        setError(`${tRides('errorLoadingData')} ${err.message || ''} Código: ${err.code || 'N/A'}`);
        if (toast) {
          toast({ title: t('error'), description: `${tRides('errorLoadingData')} Código: ${err.code || 'N/A'}. Mensaje: ${err.message || ''}`, variant: "destructive", duration: 7000 });
        }
      } finally {
        setIsLoading(false);
      }
    };
    if (stableIdToUse) fetchData();
    else setIsLoading(false);
  }, [userProfile, authLoading, activeStableId, toast, db]);

  const resetForm = () => {
    setJineteId(undefined);
    setHorseName(undefined);
    setAssignmentDate(new Date());
    setNotes("");
    setEditingAssignment(null);
  };

  const handleSubmitAssignment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const stableIdToUse = activeStableId;
    if (!jineteId || !horseName || !assignmentDate || !stableIdToUse) {
      if(toast) toast({ title: t('error'), description: tRides('completeDataToAdd'), variant: "destructive" });
      return;
    }
    setIsSubmitting(true);

    const assignmentDataForFirestore = {
      stableId: stableIdToUse,
      jineteId,
      horseName: horseName,
      date: Timestamp.fromDate(assignmentDate),
      notes: notes.trim() || null, 
      isCompleted: editingAssignment ? editingAssignment.isCompleted : false,
      completedBy: editingAssignment ? editingAssignment.completedBy : null,
      completedAt: editingAssignment && editingAssignment.completedAt 
        ? Timestamp.fromDate(
            // Aseguramos que lo que pasamos a Timestamp.fromDate sea un Date
            editingAssignment.completedAt instanceof Timestamp 
              ? editingAssignment.completedAt.toDate() 
              : new Date(editingAssignment.completedAt) // Si ya es Date, new Date() lo copia
          )
        : null,
    };
    
    const assignmentDataForState = normalizeAssignmentDates({
        ...assignmentDataForFirestore,
        date: assignmentDate,
        completedAt: editingAssignment?.completedAt
            ? (editingAssignment.completedAt instanceof Timestamp 
                ? editingAssignment.completedAt.toDate() 
                : new Date(editingAssignment.completedAt))
            : undefined
    } as unknown as HorseAssignment);


    try {
      let finalAssignment: HorseAssignment;
      if (stableIdToUse) { 
        if (editingAssignment) {
          const assignmentRef = doc(db, "horseAssignments", editingAssignment.id);
          await updateDoc(assignmentRef, {...assignmentDataForFirestore, updatedAt: serverTimestamp()});
          finalAssignment = { ...editingAssignment, ...assignmentDataForState, updatedAt: new Date() };
          setAssignments(assignments.map(a => a.id === editingAssignment.id ? finalAssignment : a).sort((a,b) => {
            const dateA = a.date instanceof Timestamp ? a.date.toDate() : a.date;
            const dateB = b.date instanceof Timestamp ? b.date.toDate() : b.date;
            return new Date(dateA).getTime() - new Date(dateB).getTime();
          }));
          if(toast) toast({ title: tRides('rideUpdated') });
        } else {
          const docRef = await addDoc(collection(db, "horseAssignments"), { ...assignmentDataForFirestore, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
          finalAssignment = { ...assignmentDataForState, id: docRef.id, createdAt: new Date(), updatedAt: new Date() };
          setAssignments([{ ...finalAssignment }, ...assignments].sort((a,b) => {
            const dateA = a.date instanceof Timestamp ? a.date.toDate() : a.date;
            const dateB = b.date instanceof Timestamp ? b.date.toDate() : b.date;
            return new Date(dateA).getTime() - new Date(dateB).getTime();
          }));
          if(toast) toast({ title: tRides('rideCreated') });
        }
      }
      resetForm();
    } catch (err: any) {
      console.error("Error al guardar monta:", err);
      if(toast) toast({ title: t('error'), description: `${editingAssignment ? tRides('errorUpdating') : tRides('errorCreating')} ${err.message || ''} Código: ${err.code || 'N/A'}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditAssignment = (assignment: HorseAssignment) => {
    const normalizedAssignment = normalizeAssignmentDates(assignment);
    setEditingAssignment(normalizedAssignment);
    setJineteId(normalizedAssignment.jineteId);
    setHorseName(normalizedAssignment.horseName);

    // Asegurar explícitamente que pasamos Date o undefined a setAssignmentDate
    let dateForState: Date | undefined = undefined;
    if (normalizedAssignment.date) {
      if (normalizedAssignment.date instanceof Timestamp) {
        dateForState = normalizedAssignment.date.toDate();
      } else if (normalizedAssignment.date instanceof Date) {
        // Solo asignar si es una fecha válida, si no, queda undefined
        if (!isNaN(new Date(normalizedAssignment.date).getTime())) {
            dateForState = new Date(normalizedAssignment.date);
        }
      } else {
        // Intentar convertir si es string u otro tipo, si no es válido, queda undefined
        const parsedDate = new Date(normalizedAssignment.date as any);
        if (!isNaN(parsedDate.getTime())) {
            dateForState = parsedDate;
        }
      }
    }
    setAssignmentDate(dateForState);
    setNotes(normalizedAssignment.notes || "");
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, "horseAssignments", assignmentId));
      setAssignments(assignments.filter(a => a.id !== assignmentId));
      if(toast) toast({ title: tRides('rideDeleted') });
    } catch (err: any) {
      console.error("Error al eliminar monta:", err);
      if(toast) toast({ title: t('error'), description: `${tRides('errorDeleting')} ${err.message || ''} Código: ${err.code || 'N/A'}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAssignmentCompletion = async (assignment: HorseAssignment) => {
    if (!userProfile) return;
    const newCompletedStatus = !assignment.isCompleted;
    const newCompletedBy = newCompletedStatus ? userProfile.uid : null;
    const newCompletedAtServer = newCompletedStatus ? serverTimestamp() : null;
    const newCompletedAtClient = newCompletedStatus ? new Date() : undefined;
    
    setIsSubmitting(true);
    try {
      const updatedAssignmentFieldsForFirestore = {
        isCompleted: newCompletedStatus,
        completedBy: newCompletedBy,
        completedAt: newCompletedAtServer,
        updatedAt: serverTimestamp()
      };
      const updatedAssignmentFieldsForState = {
        isCompleted: newCompletedStatus,
        completedBy: newCompletedBy,
        completedAt: newCompletedAtClient,
        updatedAt: new Date()
      };

      const assignmentRef = doc(db, "horseAssignments", assignment.id);
      await updateDoc(assignmentRef, updatedAssignmentFieldsForFirestore);
      setAssignments(prevAssignments => 
        prevAssignments.map(a => 
          a.id === assignment.id ? normalizeAssignmentDates({ ...a, ...updatedAssignmentFieldsForState } as HorseAssignment) : a
        )
      );
      if(toast) toast({ title: newCompletedStatus ? tRides('rideMarkedCompleted') : tRides('rideMarkedPending') });
    } catch (error: any) {
      console.error("Error al actualizar estado de monta:", error);
      if(toast) toast({ title: t('error'), description: `${tRides('errorToggling')} ${error.message || ''} Código: ${error.code || 'N/A'}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const getJineteName = (id: string) => {
    const jinete = jinetesEnCuadra.find(j => j.uid === id);
    return jinete?.displayName || id.substring(0,6)+"...";
  };


  if (authLoading || !activeStableId) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (!activeStableId && !authLoading) {
    return (
      <Alert variant="default" className="max-w-lg mx-auto">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{tRides('noActiveStable')}</AlertTitle>
        <AlertDescription>
        {tRides('pleaseJoin')}
        </AlertDescription>
      </Alert>
    );
  }
  
  if (error && !isLoading) {
     return <Alert variant="destructive" className="max-w-lg mx-auto"><AlertCircle className="h-4 w-4" /><AlertTitle>{t('error')}</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  }


  return (
    <div className="container mx-auto py-8 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="h-6 w-6" />
            {editingAssignment ? tRides('editRideDetails') : tRides('addNewRide')}
          </CardTitle>
          <CardDescription>
            {editingAssignment ? tRides('modifyRideDetails') : tRides('completeDataToAdd')}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmitAssignment}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="jineteIdJineteMontas">{tRides('riderMember')}</Label>
                <Select value={jineteId} onValueChange={setJineteId} disabled={isSubmitting}>
                  <SelectTrigger id="jineteIdJineteMontas"><SelectValue placeholder={tRides('selectMember')} /></SelectTrigger>
                  <SelectContent>
                    {jinetesEnCuadra.length > 0 ? jinetesEnCuadra.map(jinete => (
                      <SelectItem key={jinete.uid} value={jinete.uid}>{jinete.displayName}</SelectItem>
                    )) : <SelectItem value="no-jinetes" disabled>{tRides('noMembers')}</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="horseNameJineteMontas">{tRides('horse')}</Label>
                <Select value={horseName} onValueChange={setHorseName} disabled={isSubmitting}>
                  <SelectTrigger id="horseNameJineteMontas"><SelectValue placeholder={tRides('selectHorse')} /></SelectTrigger>
                  <SelectContent>
                    {horsesInStable.length > 0 ? horsesInStable.map(horse => (
                      <SelectItem key={horse.id} value={horse.name}>{horse.name}</SelectItem>
                    )) : <SelectItem value="no-caballos" disabled>{tRides('noHorses')}</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="assignmentDateJineteMontas">{tRides('dateTime')}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button id="assignmentDateJineteMontas" variant={"outline"} className={`w-full justify-start text-left font-normal ${!assignmentDate && "text-muted-foreground"}`} disabled={isSubmitting}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {assignmentDate ? format(assignmentDate, "PPP HH:mm", { locale: es }) : <span>{tRides('selectTime')}</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={assignmentDate} onSelect={setAssignmentDate} initialFocus />
                     <Input 
                        type="time" 
                        className="mt-2 p-2 border rounded-md"
                        defaultValue={assignmentDate ? format(assignmentDate, "HH:mm") : "10:00"}
                        onChange={(e) => {
                            if(assignmentDate) {
                                const [hours, minutes] = e.target.value.split(':');
                                const newDate = new Date(assignmentDate);
                                newDate.setHours(parseInt(hours), parseInt(minutes));
                                setAssignmentDate(newDate);
                            }
                        }}
                        disabled={isSubmitting || !assignmentDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <div>
              <Label htmlFor="notesJineteMontas">{tRides('notes')} ({tRides('optional')})</Label>
              <Textarea id="notesJineteMontas" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={tRides('rideNotes')} disabled={isSubmitting} />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            {editingAssignment && <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>{tRides('cancelEdit')}</Button>}
            <Button type="submit" disabled={isSubmitting || jinetesEnCuadra.length === 0 || horsesInStable.length === 0}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingAssignment ? tRides('saveChanges') : tRides('addRide')}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CustomHorseIcon className="h-6 w-6" />
            {tRides('ridesList')}
          </CardTitle>
          <CardDescription>{tRides('clickToEdit')}</CardDescription>
        </CardHeader>
        <CardContent>
        { isLoading ? (<div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>) :
          assignments.length === 0 ? (
            <p className="text-muted-foreground">{tRides('noRidesAssigned')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">{tRides('status')}</TableHead>
                  <TableHead>{tRides('rider')}</TableHead>
                  <TableHead>{tRides('horse')}</TableHead>
                  <TableHead>{tRides('dateTime')}</TableHead>
                  <TableHead>{tRides('completedBy')}</TableHead>
                  <TableHead>{tRides('notes')}</TableHead>
                  <TableHead className="text-right">{tRides('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignments.map((assignment) => {
                  // Conversión defensiva en línea justo antes de usar en format()
                  const displayDate = assignment.date instanceof Timestamp ? assignment.date.toDate() : new Date(assignment.date);
                  const displayCompletedAt = assignment.completedAt
                    ? (assignment.completedAt instanceof Timestamp ? assignment.completedAt.toDate() : new Date(assignment.completedAt))
                    : undefined;

                  return (
                  <TableRow key={assignment.id} className={assignment.isCompleted ? "bg-green-50 dark:bg-green-900/30 opacity-70" : ""}>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => toggleAssignmentCompletion(assignment)} disabled={isSubmitting} title={assignment.isCompleted ? tRides('markPending') : tRides('markCompleted')}>
                        {assignment.isCompleted ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{getJineteName(assignment.jineteId)}</TableCell>
                    <TableCell>{assignment.horseName}</TableCell>
                      <TableCell>{format(displayDate, "dd/MM/yy HH:mm", { locale: es })}</TableCell>
                    <TableCell>
                      {assignment.isCompleted && assignment.completedBy 
                          ? `${getJineteName(assignment.completedBy)} (${displayCompletedAt ? format(displayCompletedAt, "dd/MM/yy HH:mm", {locale: es}) : 'N/A'})`
                          : tRides('pending')}
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={assignment.notes || undefined}>{assignment.notes || "N/A"}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEditAssignment(assignment)} disabled={isSubmitting || !!assignment.isCompleted}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" disabled={isSubmitting}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{tRides('confirmDelete')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {tRides('irreversibleAction')}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={isSubmitting}>{t('cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteAssignment(assignment.id)} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
                              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              {t('delete')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    

    