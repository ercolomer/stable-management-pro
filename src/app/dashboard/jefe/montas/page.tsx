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
import { format, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { useTranslations } from "next-intl";

// Icono de caballo personalizado
const CustomHorseIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3.5 21h17M5.5 21V11L12 3l6.5 8v10M12 11V3"/>
    <path d="M7.5 11a2.5 2.5 0 0 1-5 0V8.5a2.5 2.5 0 0 1 5 0V11Z"/>
    <path d="M16.5 11a2.5 2.5 0 0 1 5 0V8.5a2.5 2.5 0 0 1-5 0V11Z"/>
  </svg>
);


export default function GestionMontasPage() {
  const db = getDb();
  const { userProfile, loading: authLoading, activeStableId } = useAuth();
  const { toast } = useToast();
  const t = useTranslations("common");
  const tRides = useTranslations("rides");

  // NUEVO: Estado para el filtro de fecha
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [jinetes, setJinetes] = useState<UserProfile[]>([]);
  const [horses, setHorses] = useState<Pick<Horse, 'id' | 'name' | 'stableId'>[]>([]);
  const [assignments, setAssignments] = useState<HorseAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [jineteId, setJineteId] = useState<string | undefined>(undefined);
  const [horseName, setHorseName] = useState<string | undefined>(undefined);
  const [assignmentDate, setAssignmentDate] = useState<Date | undefined>(new Date());
  const [notes, setNotes] = useState("");
  const [editingAssignment, setEditingAssignment] = useState<HorseAssignment | null>(null);
  
  // NUEVO: Función para filtrar montas por fecha seleccionada
  const filteredAssignments = useMemo(() => {
    if (!selectedDate || assignments.length === 0) return assignments;
    
    const selectedDateStart = startOfDay(selectedDate);
    
    return assignments.filter(assignment => {
      const assignmentDate = assignment.date instanceof Timestamp ? assignment.date.toDate() : new Date(assignment.date);
      const assignmentDateStart = startOfDay(assignmentDate);
      
      return assignmentDateStart.getTime() === selectedDateStart.getTime();
    });
  }, [assignments, selectedDate]);

  // NUEVO: Estadísticas para el día seleccionado
  const dayStats = useMemo(() => {
    const completed = filteredAssignments.filter(assignment => assignment.isCompleted).length;
    const pending = filteredAssignments.filter(assignment => !assignment.isCompleted).length;
    
    return { total: filteredAssignments.length, completed, pending };
  }, [filteredAssignments]);

  const normalizeAssignmentDates = (assignment: HorseAssignment): HorseAssignment => {
    return {
      ...assignment,
      date: assignment.date instanceof Timestamp ? assignment.date.toDate() : new Date(assignment.date),
      createdAt: assignment.createdAt ? (assignment.createdAt instanceof Timestamp ? assignment.createdAt.toDate() : new Date(assignment.createdAt)) : undefined,
      updatedAt: assignment.updatedAt ? (assignment.updatedAt instanceof Timestamp ? assignment.updatedAt.toDate() : new Date(assignment.updatedAt)) : undefined,
      completedAt: assignment.completedAt ? (assignment.completedAt instanceof Timestamp ? assignment.completedAt.toDate() : new Date(assignment.completedAt)) : undefined,
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
    
    if (userProfile && userProfile.role !== "jefe de cuadra") {
      setError(tRides('accessDeniedChief'));
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      console.log(`[DEBUG] GestionMontasPage (Jefe) - fetchData Diagnostics:`);
      console.log(`  Authenticated User UID (request.auth.uid): ${userProfile?.uid || 'N/A (profile not loaded)'}`);
      console.log(`  Querying for Stable ID (stableIdToUse): ${stableIdToUse}`);


      console.log(`GestionMontasPage (Jefe) - Fetching data for stableId: ${stableIdToUse}`);

      try {
        if (stableIdToUse) { 
          console.log("GestionMontasPage (Jefe) - Fetching data from Firestore.");
          const stableDocRef = doc(db, "stables", stableIdToUse);
          console.log("GestionMontasPage (Jefe) - Querying stable document:", { path: `stables/${stableIdToUse}` });
          const stableDocSnap = await getDoc(stableDocRef);
          if (!stableDocSnap.exists()) throw new Error("Cuadra no encontrada.");
          const stableData = stableDocSnap.data() as Stable;
          
          const memberIds = stableData.members; 
          
          if (memberIds.length > 0) {
            console.log("GestionMontasPage (Jefe) - Querying users collection for members:", { uids: memberIds });
            const usersQuery = query(collection(db, "users"), where("uid", "in", memberIds));
            const usersSnapshot = await getDocs(usersQuery);
            setJinetes(usersSnapshot.docs.map(d => d.data() as UserProfile));
          } else {
            setJinetes([]);
          }
          
          console.log("GestionMontasPage (Jefe) - Querying horses collection:", { collection: "horses", where: `stableId == ${stableIdToUse}` });
          const horsesQuery = query(collection(db, "horses"), where("stableId", "==", stableIdToUse));
          const horsesSnapshot = await getDocs(horsesQuery);
          setHorses(horsesSnapshot.docs.map(d => ({ id: d.id, name: d.data().name, stableId: d.data().stableId } as Pick<Horse, 'id' | 'name' | 'stableId'>)));
          
          console.log("GestionMontasPage (Jefe) - Querying horseAssignments collection:", { collection: "horseAssignments", where: `stableId == ${stableIdToUse}` });
          const assignmentsQuery = query(collection(db, "horseAssignments"), where("stableId", "==", stableIdToUse));
          const assignmentsSnapshot = await getDocs(assignmentsQuery);
          const fetchedAssignments = assignmentsSnapshot.docs.map(d => normalizeAssignmentDates({ id: d.id, ...d.data() } as HorseAssignment) );
          setAssignments(fetchedAssignments);
        } else {
            setJinetes([]);
            setHorses([]);
            setAssignments([]);
        }
      } catch (err: any) {
        console.error("Error al cargar datos:", err);
        setError(`No se pudo cargar la información necesaria. ${err.message || ''} Código: ${err.code || 'N/A'}`);
        if (toast) {
          toast({ title: "Error de Carga", description: `No se pudo cargar la información de asignaciones. Código: ${err.code || 'N/A'}. Mensaje: ${err.message || ''}`, variant: "destructive", duration: 7000 });
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
      if(toast) toast({ title: "Error", description: "Completa todos los campos requeridos y asegúrate de tener una cuadra.", variant: "destructive" });
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
            editingAssignment.completedAt instanceof Timestamp 
                ? editingAssignment.completedAt.toDate() 
                : editingAssignment.completedAt // If already a Date, use it directly
          ) 
        : null,
    };
    
    const assignmentDataForState = normalizeAssignmentDates({
        ...assignmentDataForFirestore,
        date: assignmentDate, 
        completedAt: editingAssignment?.completedAt 
    } as unknown as HorseAssignment);


    try {
      let finalAssignment: HorseAssignment;
      if (stableIdToUse) { 
        if (editingAssignment) {
          const assignmentRef = doc(db, "horseAssignments", editingAssignment.id);
          await updateDoc(assignmentRef, {...assignmentDataForFirestore, updatedAt: serverTimestamp()});
          finalAssignment = { ...editingAssignment, ...assignmentDataForState, updatedAt: new Date() };
          setAssignments(assignments.map(a => a.id === editingAssignment.id ? finalAssignment : a));
          if(toast) toast({ title: "Monta Actualizada" });
        } else {
          const docRef = await addDoc(collection(db, "horseAssignments"), { ...assignmentDataForFirestore, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
          finalAssignment = { ...assignmentDataForState, id: docRef.id, createdAt: new Date(), updatedAt: new Date() };
          setAssignments([finalAssignment, ...assignments]);
          if(toast) toast({ title: "Monta Asignada" });
        }
      }
      resetForm();
    } catch (err: any) {
      console.error("Error al guardar monta:", err);
      if(toast) toast({ title: "Error", description: `No se pudo guardar la asignación. ${err.message || ''} Código: ${err.code || 'N/A'}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditAssignment = (assignment: HorseAssignment) => {
    setEditingAssignment(normalizeAssignmentDates(assignment));
    setJineteId(assignment.jineteId);
    setHorseName(assignment.horseName);
    setAssignmentDate(new Date(assignment.date instanceof Timestamp ? assignment.date.toDate() : assignment.date));
    setNotes(assignment.notes || "");
  };

  const handleDeleteAssignment = async (assignmentId: string) => {
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, "horseAssignments", assignmentId));
      setAssignments(assignments.filter(a => a.id !== assignmentId));
      if(toast) toast({ title: "Monta Eliminada" });
    } catch (err: any) {
      console.error("Error al eliminar monta:", err);
      if(toast) toast({ title: "Error", description: `No se pudo eliminar la asignación. ${err.message || ''} Código: ${err.code || 'N/A'}`, variant: "destructive" });
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
      if(toast) toast({ title: "Estado de Monta Actualizado" });
    } catch (error: any) {
      console.error("Error al actualizar estado de monta:", error);
      if(toast) toast({ title: "Error", description: `No se pudo actualizar el estado. ${error.message || ''} Código: ${error.code || 'N/A'}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const getJineteName = (id: string) => {
    const jinete = jinetes.find(j => j.uid === id);
    return jinete?.displayName || id.substring(0,6)+"...";
  };


  if (authLoading || !activeStableId ) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  
  if (!activeStableId && !authLoading) {
    return (
      <Alert variant="default" className="max-w-lg mx-auto">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No tienes una cuadra activa</AlertTitle>
        <AlertDescription>
        Por favor, <Link href="/profile" className="text-primary underline">crea o selecciona una cuadra</Link> para gestionar montas.
        </AlertDescription>
      </Alert>
    );
  }
  
  if (error && !isLoading) {
     return <Alert variant="destructive" className="max-w-lg mx-auto"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  }


  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* NUEVO: Selector de fecha para filtrar montas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-6 w-6" />
            {tRides('filterByDay')}
          </CardTitle>
          <CardDescription>
            {tRides('selectDayToFilterRides')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex-1">
                              <Label htmlFor="dateFilterMontas">{tRides('selectedDate')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="dateFilterMontas"
                    variant="outline"
                    className="w-full md:w-auto justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(selectedDate, "EEEE, dd 'de' MMMM, yyyy", { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(startOfDay(date))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Estadísticas del día */}
            <div className="flex gap-2 flex-wrap">
              <div className="bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-lg text-sm">
                <span className="font-medium text-blue-700 dark:text-blue-300">{tRides('totalRides')}: {dayStats.total}</span>
              </div>
              <div className="bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded-lg text-sm">
                <span className="font-medium text-green-700 dark:text-green-300">Completadas: {dayStats.completed}</span>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/30 px-3 py-1 rounded-lg text-sm">
                <span className="font-medium text-yellow-700 dark:text-yellow-300">Pendientes: {dayStats.pending}</span>
              </div>
            </div>
          </div>
          
          {/* Botones de navegación rápida */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(startOfDay(new Date()))}
              className={selectedDate.toDateString() === new Date().toDateString() ? "bg-primary text-primary-foreground" : ""}
            >
              Hoy
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                setSelectedDate(startOfDay(tomorrow));
              }}
            >
              Mañana
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() + 7);
                setSelectedDate(startOfDay(nextWeek));
              }}
            >
              Próxima semana
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="h-6 w-6" />
{editingAssignment ? tRides('editRide') : tRides('addNewRide')}
          </CardTitle>
          <CardDescription>
            {editingAssignment ? "Modifica los detalles de la monta." : "Asigna jinetes a caballos para montas específicas."}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmitAssignment}>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="jineteIdJefeMontas">Jinete/Miembro</Label>
                <Select value={jineteId} onValueChange={setJineteId} disabled={isSubmitting}>
                  <SelectTrigger id="jineteIdJefeMontas"><SelectValue placeholder="Selecciona un miembro" /></SelectTrigger>
                  <SelectContent>
                    {jinetes.length > 0 ? jinetes.map(jinete => (
                      <SelectItem key={jinete.uid} value={jinete.uid}>{jinete.displayName}</SelectItem>
                    )) : <SelectItem value="no-jinetes" disabled>No hay miembros</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="horseNameJefeMontas">Caballo</Label>
                <Select value={horseName} onValueChange={setHorseName} disabled={isSubmitting}>
                  <SelectTrigger id="horseNameJefeMontas"><SelectValue placeholder="Selecciona un caballo" /></SelectTrigger>
                  <SelectContent>
                    {horses.length > 0 ? horses.map(horse => (
                      <SelectItem key={horse.id} value={horse.name}>{horse.name}</SelectItem>
                    )) : <SelectItem value="no-caballos" disabled>No hay caballos</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="assignmentDateJefeMontas">Fecha y Hora de la Monta</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button id="assignmentDateJefeMontas" variant={"outline"} className={`w-full justify-start text-left font-normal ${!assignmentDate && "text-muted-foreground"}`} disabled={isSubmitting}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {assignmentDate ? format(assignmentDate, "PPP HH:mm", { locale: es }) : <span>Selecciona fecha y hora</span>}
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
              <Label htmlFor="notesJefeMontas">Notas Adicionales (Opcional)</Label>
              <Textarea id="notesJefeMontas" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: Enfocarse en transiciones..." disabled={isSubmitting} />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            {editingAssignment && <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>Cancelar Edición</Button>}
            <Button type="submit" disabled={isSubmitting || jinetes.length === 0 || horses.length === 0}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingAssignment ? "Guardar Cambios" : "Asignar Monta"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CustomHorseIcon className="h-6 w-6" />
            Montas para {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: es })}
          </CardTitle>
          <CardDescription>
            {filteredAssignments.length === 0 
              ? `No hay montas programadas para ${format(selectedDate, "dd/MM/yyyy", { locale: es })}`
              : `Mostrando ${filteredAssignments.length} monta${filteredAssignments.length === 1 ? '' : 's'} para el día seleccionado`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          { isLoading ? (<div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>) :
            filteredAssignments.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-muted-foreground">No hay montas programadas para este día.</p>
              <p className="text-sm text-muted-foreground">
                Puedes crear una nueva monta arriba o seleccionar otro día en el filtro.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Estado</TableHead>
                  <TableHead>Jinete</TableHead>
                  <TableHead>Caballo</TableHead>
                  <TableHead>Fecha y Hora</TableHead>
                  <TableHead>Completada por</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssignments.sort((a,b) => {
                  const dateA = a.date instanceof Timestamp ? a.date.toDate() : a.date;
                  const dateB = b.date instanceof Timestamp ? b.date.toDate() : b.date;
                  return new Date(dateA).getTime() - new Date(dateB).getTime();
                }).map((assignment) => {
                  // Convertir Timestamps a Dates para formateo seguro
                  const displayDate = assignment.date instanceof Timestamp ? assignment.date.toDate() : assignment.date;
                  const displayCompletedAt = assignment.completedAt instanceof Timestamp ? assignment.completedAt.toDate() : assignment.completedAt;

                  return (
                  <TableRow key={assignment.id} className={assignment.isCompleted ? "bg-green-50 dark:bg-green-900/30 opacity-70" : ""}>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => toggleAssignmentCompletion(assignment)} disabled={isSubmitting} title={assignment.isCompleted ? "Marcar como pendiente" : "Marcar como completada"}>
                        {assignment.isCompleted ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">{getJineteName(assignment.jineteId)}</TableCell>
                    <TableCell>{assignment.horseName}</TableCell>
                      <TableCell>{format(new Date(displayDate), "dd/MM/yy HH:mm", { locale: es })}</TableCell>
                    <TableCell>
                      {assignment.isCompleted && assignment.completedBy 
                          ? `${getJineteName(assignment.completedBy)} (${displayCompletedAt ? format(new Date(displayCompletedAt), "dd/MM/yy HH:mm", {locale: es}) : 'N/A'})`
                          : "Pendiente"}
                    </TableCell>
                      <TableCell className="max-w-xs truncate" title={assignment.notes || undefined}>{assignment.notes || "-"}</TableCell>
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
                            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Se eliminará esta asignación de monta.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteAssignment(assignment.id)} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
                              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Eliminar
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

    
