
"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { getDb } from "@/lib/firebase/config";
import { collection, getDocs, query, where, Timestamp, doc, getDoc } from "firebase/firestore";
import type { DailyTask, HorseAssignment, Horse, UserProfile, Stable } from "@/types";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle, CalendarDays, ListChecks, Info } from "lucide-react";
import { format, isSameDay, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

// Icono de caballo personalizado
const CustomHorseIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3.5 21h17M5.5 21V11L12 3l6.5 8v10M12 11V3"/>
    <path d="M7.5 11a2.5 2.5 0 0 1-5 0V8.5a2.5 2.5 0 0 1 5 0V11Z"/>
    <path d="M16.5 11a2.5 2.5 0 0 1 5 0V8.5a2.5 2.5 0 0 1-5 0V11Z"/>
  </svg>
);

export default function CalendarioCuadraPage() {
  const db = getDb();
  const { userProfile, loading: authLoading, activeStableId } = useAuth();
  const { toast } = useToast(); 

  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [assignments, setAssignments] = useState<HorseAssignment[]>([]);
  const [horses, setHorses] = useState<Horse[]>([]);
  const [jinetes, setJinetes] = useState<UserProfile[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    // Initialize selectedDate on the client side after hydration
    setSelectedDate(startOfDay(new Date()));
  }, []);

  useEffect(() => {
    if (authLoading) return;

    const stableIdToUse = activeStableId;

    if (!stableIdToUse) {
      setError("No estás asignado a ninguna cuadra. Únete o crea una para ver el calendario.");
      setIsLoading(false);
      return;
    }
    
    console.log(`[DEBUG] CalendarioCuadraPage - fetchData Diagnostics:`);
    console.log(`  Authenticated User UID (request.auth.uid): ${userProfile?.uid || 'N/A (profile not loaded)'}`);
    console.log(`  Querying for Stable ID (stableIdToUse): ${stableIdToUse}`);

    console.log(`CalendarioCuadraPage - Fetching data for stableId: ${stableIdToUse}`);

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        console.log("CalendarioCuadraPage - Fetching data from Firestore.");
        
        console.log("CalendarioCuadraPage - Querying tasks collection:", { collection: "tasks", where: `stableId == ${stableIdToUse}` });
        const tasksQuery = query(collection(db, "tasks"), where("stableId", "==", stableIdToUse));
        const tasksSnapshot = await getDocs(tasksQuery);
        setTasks(tasksSnapshot.docs.map(d => ({id: d.id, ...d.data(), assignmentScope: d.data().assignmentScope || (d.data().assignedTo ? 'SPECIFIC_USER' : 'ANYONE_IN_STABLE'), createdAt: (d.data().createdAt as Timestamp).toDate(), dueDate: d.data().dueDate ? (d.data().dueDate as Timestamp).toDate() : undefined, completedAt: d.data().completedAt ? (d.data().completedAt as Timestamp).toDate() : undefined } as DailyTask)));
        
        console.log("CalendarioCuadraPage - Querying horseAssignments collection:", { collection: "horseAssignments", where: `stableId == ${stableIdToUse}` });
        const assignmentsQuery = query(collection(db, "horseAssignments"), where("stableId", "==", stableIdToUse));
        const assignmentsSnapshot = await getDocs(assignmentsQuery);
        setAssignments(assignmentsSnapshot.docs.map(d => ({id: d.id, ...d.data(), date: (d.data().date as Timestamp).toDate(), createdAt: (d.data().createdAt as Timestamp)?.toDate() || new Date(), completedAt: d.data().completedAt ? (d.data().completedAt as Timestamp).toDate() : undefined } as HorseAssignment)));
        
        console.log("CalendarioCuadraPage - Querying horses collection:", { collection: "horses", where: `stableId == ${stableIdToUse}` });
        const horsesQuery = query(collection(db, "horses"), where("stableId", "==", stableIdToUse));
        const horsesSnapshot = await getDocs(horsesQuery);
        setHorses(horsesSnapshot.docs.map(d => ({id: d.id, ...d.data(), entryDate: d.data().entryDate ? (d.data().entryDate as Timestamp).toDate() : undefined, exitDate: d.data().exitDate ? (d.data().exitDate as Timestamp).toDate() : undefined, farrierDueDate: d.data().farrierDueDate ? (d.data().farrierDueDate as Timestamp).toDate() : undefined, historicalStays: d.data().historicalStays?.map((s: any) => ({...s, entryDate: s.entryDate instanceof Timestamp ? s.entryDate.toDate() : new Date(s.entryDate), exitDate: s.exitDate ? (s.exitDate instanceof Timestamp ? s.exitDate.toDate() : new Date(s.exitDate)) : undefined })) || [] } as Horse)));
        
        console.log("CalendarioCuadraPage - Querying stable document:", { path: `stables/${stableIdToUse}` });
        const stableDocRef = doc(db, "stables", stableIdToUse);
        const stableDocSnap = await getDoc(stableDocRef);
        if (stableDocSnap.exists()) {
          const stableData = stableDocSnap.data() as Stable;
          const memberIds = stableData.members || [];
          if (memberIds.length > 0) {
            console.log("CalendarioCuadraPage - Querying users collection for members:", { uids: memberIds });
            const usersQuery = query(collection(db, "users"), where("uid", "in", memberIds));
            const usersSnapshot = await getDocs(usersQuery);
            setJinetes(usersSnapshot.docs.map(d => d.data() as UserProfile));
          } else {
            setJinetes([]);
          }
        } else {
          setJinetes([]);
        }
      } catch (err: any) {
        console.error("Error al cargar datos para el calendario:", err);
        setError(`No se pudo cargar la información del calendario. ${err.message || ''} Código: ${err.code || 'N/A'}`);
        if (toast) { 
            toast({ title: "Error de Carga", description: `No se pudo cargar la información del calendario. Código: ${err.code || 'N/A'}. Mensaje: ${err.message || ''}`, variant: "destructive", duration: 7000});
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (stableIdToUse) { 
      fetchData();
    } else {
      setIsLoading(false);
    }

  }, [userProfile, authLoading, activeStableId, toast, db]);

  const getJineteName = (uid: string | null | undefined) => {
    if (!uid) return "Desconocido";
    const jinete = jinetes.find(j => j.uid === uid);
    return jinete?.displayName || `ID Usuario: ${uid.substring(0, 6)}...`;
  };
  
  const getAssignedToTextForTask = (task: DailyTask) => {
    if (task.assignmentScope === 'SPECIFIC_USER' && task.assignedTo) {
      return getJineteName(task.assignedTo);
    }
    if (task.assignmentScope === 'ALL_MEMBERS_INDIVIDUALLY') return "Todos (Individual)";
    if (task.assignmentScope === 'ANYONE_IN_STABLE') return "Cualquiera";
    return "Desconocido";
  };

  const activitiesForSelectedDate = useMemo(() => {
    if (!selectedDate) return { dailyTasks: [], dailyAssignments: [], horseEvents: [] };

    const sDate = startOfDay(selectedDate);

    const dailyTasks = tasks.filter(task => 
      (task.dueDate && isSameDay(startOfDay(task.dueDate instanceof Timestamp ? task.dueDate.toDate() : new Date(task.dueDate)), sDate)) ||
      (task.completedAt && isSameDay(startOfDay(task.completedAt instanceof Timestamp ? task.completedAt.toDate() : new Date(task.completedAt)), sDate)) ||
      (task.createdAt && isSameDay(startOfDay(task.createdAt instanceof Timestamp ? task.createdAt.toDate() : new Date(task.createdAt)), sDate) && !task.dueDate && !task.isCompleted)
    );

    const dailyAssignments = assignments.filter(assignment => 
      isSameDay(startOfDay(assignment.date instanceof Timestamp ? assignment.date.toDate() : new Date(assignment.date)), sDate)
    );
    
    const horseEvents: Array<{ type: string; horseName: string; date: Date; notes?: string }> = [];
    horses.forEach(horse => {
      const horseEntryDate = horse.entryDate ? startOfDay(horse.entryDate instanceof Timestamp ? horse.entryDate.toDate() : new Date(horse.entryDate)) : null;
      const horseExitDate = horse.exitDate ? startOfDay(horse.exitDate instanceof Timestamp ? horse.exitDate.toDate() : new Date(horse.exitDate)) : null;
      const horseFarrierDate = horse.farrierDueDate ? startOfDay(horse.farrierDueDate instanceof Timestamp ? horse.farrierDueDate.toDate() : new Date(horse.farrierDueDate)) : null;

      if (horseEntryDate && isSameDay(horseEntryDate, sDate)) {
        horseEvents.push({ type: "Ingreso Principal", horseName: horse.name, date: horseEntryDate });
      }
      if (horseExitDate && isSameDay(horseExitDate, sDate)) {
        horseEvents.push({ type: "Salida Principal", horseName: horse.name, date: horseExitDate });
      }
      if (horseFarrierDate && isSameDay(horseFarrierDate, sDate)) {
        horseEvents.push({ type: "Cita Herrador", horseName: horse.name, date: horseFarrierDate });
      }
      horse.historicalStays?.forEach(stay => {
        const stayEntry = startOfDay(stay.entryDate instanceof Timestamp ? stay.entryDate.toDate() : new Date(stay.entryDate));
        const stayExit = stay.exitDate ? startOfDay(stay.exitDate instanceof Timestamp ? stay.exitDate.toDate() : new Date(stay.exitDate)) : null;
        if (isSameDay(stayEntry, sDate)) {
          horseEvents.push({ type: "Ingreso Histórico", horseName: horse.name, date: stayEntry, notes: stay.notes });
        }
        if (stayExit && isSameDay(stayExit, sDate)) {
          horseEvents.push({ type: "Salida Histórica", horseName: horse.name, date: stayExit, notes: stay.notes });
        }
      });
    });

    return { dailyTasks, dailyAssignments, horseEvents };
  }, [selectedDate, tasks, assignments, horses, jinetes]); 
  
  const calendarModifiers = useMemo(() => {
    const eventDays = new Set<string>();
    
    assignments.forEach(a => eventDays.add(startOfDay(a.date instanceof Timestamp ? a.date.toDate() : new Date(a.date)).toISOString()));
    tasks.forEach(t => {
      if (t.dueDate) eventDays.add(startOfDay(t.dueDate instanceof Timestamp ? t.dueDate.toDate() : new Date(t.dueDate)).toISOString());
      if (t.completedAt) eventDays.add(startOfDay(t.completedAt instanceof Timestamp ? t.completedAt.toDate() : new Date(t.completedAt)).toISOString());
      if (t.createdAt && !t.dueDate && !t.isCompleted) eventDays.add(startOfDay(t.createdAt instanceof Timestamp ? t.createdAt.toDate() : new Date(t.createdAt)).toISOString());
    });
    horses.forEach(h => {
      if (h.entryDate) eventDays.add(startOfDay(h.entryDate instanceof Timestamp ? h.entryDate.toDate() : new Date(h.entryDate)).toISOString());
      if (h.exitDate) eventDays.add(startOfDay(h.exitDate instanceof Timestamp ? h.exitDate.toDate() : new Date(h.exitDate)).toISOString());
      if (h.farrierDueDate) eventDays.add(startOfDay(h.farrierDueDate instanceof Timestamp ? h.farrierDueDate.toDate() : new Date(h.farrierDueDate)).toISOString());
      h.historicalStays?.forEach(s => {
        eventDays.add(startOfDay(s.entryDate instanceof Timestamp ? s.entryDate.toDate() : new Date(s.entryDate)).toISOString());
        if (s.exitDate) eventDays.add(startOfDay(s.exitDate instanceof Timestamp ? s.exitDate.toDate() : new Date(s.exitDate)).toISOString());
      });
    });
    
    return {
      hasEvents: Array.from(eventDays).map(dateStr => new Date(dateStr)),
    };
  }, [assignments, tasks, horses]);

  const calendarModifiersClassNames = {
    hasEvents: 'bg-primary/20 text-primary-foreground rounded-md', 
    today: 'bg-accent text-accent-foreground ring-2 ring-accent rounded-md', 
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
          Por favor, <Link href="/profile" className="text-primary underline">crea o selecciona una cuadra</Link> para ver el calendario.
        </AlertDescription>
      </Alert>
    );
  }
  
  if (error && !isLoading) {
    return <Alert variant="destructive" className="max-w-lg mx-auto"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  }


  return (
    <div className="container mx-auto py-8 space-y-6">
      {isLoading && <div className="flex h-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}
      
      {!isLoading && !error && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CalendarDays className="h-6 w-6 text-primary" />Calendario de la Cuadra</CardTitle>
              <CardDescription>Selecciona un día para ver todas las actividades y eventos programados para toda la cuadra.</CardDescription>
            </CardHeader>
          </Card>

          <div className="flex flex-col md:flex-row gap-6">
            <Card className="w-full md:w-auto md:max-w-md"> 
              <CardContent className="p-2 md:p-4">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => setSelectedDate(date ? startOfDay(date) : undefined)}
                  locale={es}
                  className="rounded-md border shadow-sm mx-auto"
                  modifiers={calendarModifiers}
                  modifiersClassNames={calendarModifiersClassNames}
                  disabled={isLoading}
                />
              </CardContent>
            </Card>

            <div className="flex-1 space-y-6"> 
              {selectedDate ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Actividades para el {format(selectedDate, "PPP", { locale: es })}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><ListChecks className="h-5 w-5 text-blue-600 dark:text-blue-400"/>Tareas del Día</h3>
                      {activitiesForSelectedDate.dailyTasks.length > 0 ? (
                        <ul className="space-y-2 text-sm">
                          {activitiesForSelectedDate.dailyTasks.map(task => (
                            <li key={task.id} className={`p-2 rounded-md ${task.isCompleted ? 'bg-green-100 dark:bg-green-800/40' : 'bg-amber-50 dark:bg-amber-800/30'}`}>
                              <p><strong>{task.description}</strong></p>
                              <p className="text-xs text-muted-foreground">
                                Sugerida a: {getAssignedToTextForTask(task)}
                              </p>
                              {task.isCompleted ? (
                                <p className="text-xs text-green-600 dark:text-green-400">Completada por: {getJineteName(task.completedBy)} el {task.completedAt ? format(task.completedAt instanceof Timestamp ? task.completedAt.toDate() : new Date(task.completedAt), "dd/MM/yy HH:mm", {locale: es}) : 'N/A'}</p>
                              ) : (
                                <p className="text-xs text-amber-600 dark:text-amber-400">Pendiente. {task.dueDate && `Vence: ${format(task.dueDate instanceof Timestamp ? task.dueDate.toDate() : new Date(task.dueDate), "dd/MM/yy")}`}</p>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (<p className="text-sm text-muted-foreground">No hay tareas para este día.</p>)}
                    </div>
                    <hr/>
                    <div>
                      <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><CustomHorseIcon className="h-5 w-5 text-green-600 dark:text-green-400"/>Montas del Día</h3>
                      {activitiesForSelectedDate.dailyAssignments.length > 0 ? (
                        <ul className="space-y-2 text-sm">
                          {activitiesForSelectedDate.dailyAssignments.map(assignment => (
                            <li key={assignment.id} className={`p-2 rounded-md ${assignment.isCompleted ? 'bg-green-100 dark:bg-green-800/40' : 'bg-gray-100 dark:bg-gray-700/40'}`}>
                              <p><strong>{assignment.horseName}</strong> montado por <strong>{getJineteName(assignment.jineteId)}</strong></p>
                              {assignment.notes && <p className="text-xs text-muted-foreground">Notas: {assignment.notes}</p>}
                              {assignment.isCompleted ? (
                                <p className="text-xs text-green-600 dark:text-green-400">Completada por: {getJineteName(assignment.completedBy)} el {assignment.completedAt ? format(assignment.completedAt instanceof Timestamp ? assignment.completedAt.toDate() : new Date(assignment.completedAt), "dd/MM/yy HH:mm", {locale: es}) : 'N/A'}</p>
                              ) : (
                                <p className="text-xs text-gray-500 dark:text-gray-400">Pendiente.</p>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (<p className="text-sm text-muted-foreground">No hay montas programadas para este día.</p>)}
                    </div>
                    <hr/>
                    <div>
                      <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><Info className="h-5 w-5 text-purple-600 dark:text-purple-400"/>Eventos de Caballos</h3>
                      {activitiesForSelectedDate.horseEvents.length > 0 ? (
                        <ul className="space-y-2 text-sm">
                          {activitiesForSelectedDate.horseEvents.map((event, index) => (
                            <li key={`horse_event_calendario_${index}`} className="p-2 rounded-md bg-purple-50 dark:bg-purple-800/30">
                              <p><strong>{event.horseName}</strong>: {event.type}</p>
                              {event.notes && <p className="text-xs text-muted-foreground">Notas: {event.notes}</p>}
                            </li>
                          ))}
                        </ul>
                      ) : (<p className="text-sm text-muted-foreground">No hay ingresos, salidas o citas de herrador para este día.</p>)}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-muted-foreground">Selecciona un día en el calendario para ver los detalles.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
    

    
