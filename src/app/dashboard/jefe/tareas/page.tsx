"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { getDb } from "@/lib/firebase/config"; 
import { collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc, serverTimestamp, Timestamp, getDoc } from "firebase/firestore";
import type { DailyTask, UserProfile, Stable, AssignmentScope } from "@/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ListChecks, PlusCircle, Edit2, Trash2, CalendarIcon, AlertCircle, CheckCircle2, Circle, AlertTriangle } from "lucide-react";
import { format, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslations } from "next-intl";
import StableWrapper from "@/components/stable-wrapper";

export default function GestionTareasPage() {
  const db = getDb(); 
  const { userProfile, loading: authLoading, activeStableId } = useAuth();
  const { toast } = useToast();
  const t = useTranslations("common");
  const tTasks = useTranslations("tasks");

  // Estado para evitar errores de DOM durante desmontaje
  const [isMounted, setIsMounted] = useState(true);
  
  // NUEVO: Estado para el filtro de fecha
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [jinetes, setJinetes] = useState<UserProfile[]>([]);
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState<string | null | undefined>(undefined); 
  const [assignmentScope, setAssignmentScope] = useState<AssignmentScope>('ANYONE_IN_STABLE');
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [editingTask, setEditingTask] = useState<DailyTask | null>(null);

  // NUEVO: Función para filtrar tareas por fecha seleccionada
  const filteredTasks = useMemo(() => {
    if (!selectedDate || tasks.length === 0) return tasks;
    
    const selectedDateStart = startOfDay(selectedDate);
    const selectedDateEnd = new Date(selectedDateStart);
    selectedDateEnd.setDate(selectedDateEnd.getDate() + 1);
    
    return tasks.filter(task => {
      if (!task.dueDate) return false; // Solo mostrar tareas con fecha de entrega
      
      const taskDate = task.dueDate instanceof Timestamp ? task.dueDate.toDate() : new Date(task.dueDate);
      const taskDateStart = startOfDay(taskDate);
      
      return taskDateStart.getTime() === selectedDateStart.getTime();
    });
  }, [tasks, selectedDate]);

  // NUEVO: Estadísticas para el día seleccionado
  const dayStats = useMemo(() => {
    const completed = filteredTasks.filter(task => task.isCompleted).length;
    const pending = filteredTasks.filter(task => !task.isCompleted).length;
    const overdue = filteredTasks.filter(task => {
      if (task.isCompleted) return false;
      const taskDate = task.dueDate instanceof Timestamp ? task.dueDate.toDate() : new Date(task.dueDate!);
      return taskDate < startOfDay(new Date());
    }).length;
    
    return { total: filteredTasks.length, completed, pending, overdue };
  }, [filteredTasks]);

  useEffect(() => {
    setIsMounted(true);
    
    if (authLoading || !isMounted) return;

    const stableIdToUse = activeStableId;

    if (!stableIdToUse) {
      if (isMounted) {
        setError(tTasks('notAssignedToStable'));
        setIsLoading(false);
      }
      return;
    }
    
    if (userProfile && userProfile.role !== "jefe de cuadra") {
      if (isMounted) {
        setError(tTasks('accessDeniedChief'));
        setIsLoading(false);
      }
      return;
    }

    const fetchData = async () => {
      if (!isMounted) return;
      
      setIsLoading(true);
      setError(null);
      console.log(`[DEBUG] GestionTareasPage (Jefe) - fetchData Diagnostics:`);
      console.log(`  Authenticated User UID (request.auth.uid): ${userProfile?.uid || 'N/A (profile not loaded)'}`);
      console.log(`  Querying for Stable ID (stableIdToUse): ${stableIdToUse}`);

      console.log(`GestionTareasPage (Jefe) - Fetching data for stableId: ${stableIdToUse}`);

      try {
        console.log("GestionTareasPage (Jefe) - Fetching data from Firestore.");
        const stableDocRef = doc(db, "stables", stableIdToUse);
        console.log("GestionTareasPage (Jefe) - Querying stable document:", { path: `stables/${stableIdToUse}` });
        const stableDocSnap = await getDoc(stableDocRef);
        if (!stableDocSnap.exists()) throw new Error("Cuadra no encontrada.");
        const stableData = stableDocSnap.data() as Stable;
        
        const allMemberIds = stableData.members;

        if (allMemberIds.length > 0) {
          console.log("GestionTareasPage (Jefe) - Querying users collection for members:", { uids: allMemberIds });
          const usersQuery = query(collection(db, "users"), where("uid", "in", allMemberIds));
          const usersSnapshot = await getDocs(usersQuery);
          if (isMounted) setJinetes(usersSnapshot.docs.map(d => d.data() as UserProfile));
        } else {
          if (isMounted) setJinetes([]);
        }

        console.log("GestionTareasPage (Jefe) - Querying tasks collection:", { collection: "tasks", where: `stableId == ${stableIdToUse}` });
        const tasksQuery = query(collection(db, "tasks"), where("stableId", "==", stableIdToUse));
        const tasksSnapshot = await getDocs(tasksQuery);
        const fetchedTasks = tasksSnapshot.docs.map(d => ({
          id: d.id,
          ...d.data(),
          assignmentScope: d.data().assignmentScope || (d.data().assignedTo ? 'SPECIFIC_USER' : 'ANYONE_IN_STABLE'),
          createdAt: (d.data().createdAt as Timestamp).toDate(),
          dueDate: d.data().dueDate ? (d.data().dueDate as Timestamp).toDate() : undefined,
          completedAt: d.data().completedAt ? (d.data().completedAt as Timestamp).toDate() : undefined,
        } as DailyTask));
        
        if (isMounted) setTasks(fetchedTasks);
        
      } catch (err: any) {
        console.error("Error al cargar datos:", err);
        if (isMounted) {
          setError(`${tTasks('errorLoadingData')} ${err.message || ''} Código: ${err.code || 'N/A'}`);
          if (toast) {
            toast({ title: t('error'), description: `${tTasks('errorLoadingData')} Código: ${err.code || 'N/A'}. Mensaje: ${err.message || ''}`, variant: "destructive", duration: 7000 });
          }
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    
    if (stableIdToUse) fetchData();
    else if (isMounted) setIsLoading(false);
    
    return () => {
      setIsMounted(false);
    };
  }, [userProfile, authLoading, activeStableId, toast, db, tTasks, isMounted]);

  const handleAssignmentChange = (value: string) => {
    if (!isMounted) return;
    
    if (value === "ANYONE_IN_STABLE" || value === "ALL_MEMBERS_INDIVIDUALLY") {
      setAssignmentScope(value as AssignmentScope);
      setAssignedTo(null);
    } else {
      setAssignmentScope('SPECIFIC_USER');
      setAssignedTo(value);
    }
  };

  const resetForm = () => {
    if (!isMounted) return;
    
    setDescription("");
    setAssignedTo(undefined); 
    setAssignmentScope('ANYONE_IN_STABLE'); 
    setDueDate(undefined);
    setEditingTask(null);
  };

  const handleSubmitTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isMounted) return; // Guard temprano
    
    const stableIdToUse = activeStableId;

    if (!description.trim()) { 
      if(isMounted && toast) toast({ title: t('error'), description: tTasks('taskDescriptionRequired'), variant: "destructive" });
      return;
    }
    if (!stableIdToUse) {
        if(isMounted && toast) toast({ title: t('error'), description: tTasks('stableNotDetermined'), variant: "destructive" });
        return;
    }

    setIsSubmitting(true);

    const taskDataForFirestore: Omit<DailyTask, 'id' | 'createdAt' | 'updatedAt'> = {
      stableId: stableIdToUse,
      description: description.trim(),
      assignmentScope: assignmentScope,
      assignedTo: assignmentScope === 'SPECIFIC_USER' ? assignedTo : null,
      dueDate: dueDate ? Timestamp.fromDate(startOfDay(dueDate)) : null,
      isCompleted: editingTask ? editingTask.isCompleted : false,
      completedBy: editingTask ? (editingTask.completedBy || null) : null,
      completedAt: editingTask && editingTask.completedAt ? (editingTask.completedAt instanceof Date ? Timestamp.fromDate(editingTask.completedAt) : editingTask.completedAt) : null,
    };
    
    const taskDataForStateUpdate = {
      ...taskDataForFirestore,
      dueDate: dueDate ? startOfDay(dueDate) : undefined,
      completedAt: editingTask?.completedAt instanceof Timestamp ? editingTask.completedAt.toDate() : (editingTask?.completedAt instanceof Date ? editingTask.completedAt : undefined)
    };

    try {
      if (editingTask) {
        const taskRef = doc(db, "tasks", editingTask.id);
        await updateDoc(taskRef, { ...taskDataForFirestore, updatedAt: serverTimestamp() });
        
        if (isMounted) {
          const finalTaskState = { ...editingTask, ...taskDataForStateUpdate, updatedAt: new Date() } as DailyTask;
          setTasks(tasks.map(t => t.id === editingTask.id ? finalTaskState : t).sort((a,b) => {
            const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toDate() : a.createdAt;
            const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toDate() : b.createdAt;
            return new Date(dateB).getTime() - new Date(dateA).getTime();
          }));
          if(toast) toast({ title: tTasks('taskUpdated'), description: tTasks('taskModified') });
          resetForm();
        }
      } else {
        const docRef = await addDoc(collection(db, "tasks"), { ...taskDataForFirestore, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        
        if (isMounted) {
          const finalTaskState = { ...taskDataForStateUpdate, id: docRef.id, createdAt: new Date(), updatedAt: new Date() } as DailyTask;
          setTasks([{ ...finalTaskState }, ...tasks].sort((a,b) => {
            const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toDate() : a.createdAt;
            const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toDate() : b.createdAt;
            return new Date(dateB).getTime() - new Date(dateA).getTime();
          }));
          if(toast) toast({ title: tTasks('taskCreated'), description: tTasks('newTaskAssigned') });
          resetForm();
        }
      }
    } catch (err: any) {
      console.error("Error al guardar tarea:", err);
      if(isMounted && toast) toast({ title: t('error'), description: `${tTasks('errorSaving')} ${err.message || ''} Código: ${err.code || 'N/A'}`, variant: "destructive" });
    } finally {
      if (isMounted) setIsSubmitting(false);
    }
  };

  const handleEditTask = (task: DailyTask) => {
    if (!isMounted) return;
    
    setEditingTask(task);
    setDescription(task.description);
    setAssignmentScope(task.assignmentScope || (task.assignedTo ? 'SPECIFIC_USER' : 'ANYONE_IN_STABLE'));
    setAssignedTo(task.assignedTo); 
    setDueDate(task.dueDate ? (task.dueDate instanceof Timestamp ? task.dueDate.toDate() : new Date(task.dueDate)) : undefined);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!isMounted) return; // Guard temprano
    
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, "tasks", taskId));
      if (isMounted) {
        setTasks(tasks.filter(t => t.id !== taskId));
        if(toast) toast({ title: tTasks('taskDeleted'), description: tTasks('taskRemoved') });
      }
    } catch (err: any) {
      console.error("Error al eliminar tarea:", err);
      if(isMounted && toast) toast({ title: t('error'), description: `${tTasks('errorDeleting')} ${err.message || ''} Código: ${err.code || 'N/A'}`, variant: "destructive" });
    } finally {
      if (isMounted) setIsSubmitting(false);
    }
  };
  
  const toggleTaskCompletion = async (task: DailyTask) => {
    if (!userProfile || !isMounted) return; // Guard temprano
    
    const newCompletedStatus = !task.isCompleted;
    const newCompletedBy = newCompletedStatus ? userProfile.uid : null;
    const newCompletedAt = newCompletedStatus ? serverTimestamp() : null;
    
    const taskForStateUpdate = {
        ...task,
        isCompleted: newCompletedStatus,
        completedBy: newCompletedBy,
        completedAt: newCompletedStatus ? new Date() : undefined, 
        updatedAt: new Date()
    };

    setIsSubmitting(true);
    try {
      const taskRef = doc(db, "tasks", task.id);
      await updateDoc(taskRef, { 
          isCompleted: newCompletedStatus, 
          completedBy: newCompletedBy,
          completedAt: newCompletedAt, 
          updatedAt: serverTimestamp() 
      });
      
      if (isMounted) {
        setTasks(tasks.map(t => t.id === task.id ? taskForStateUpdate : t));
        if(toast) toast({ title: tTasks('taskStatusUpdated') });
      }
    } catch (error: any) {
      console.error("Error al actualizar estado de tarea:", error);
      if(isMounted && toast) toast({ title: t('error'), description: `${tTasks('errorUpdatingStatus')} ${error.message || ''} Código: ${error.code || 'N/A'}`, variant: "destructive" });
    } finally {
      if (isMounted) setIsSubmitting(false);
    }
  };

  const getAssignedToText = (task: DailyTask) => {
    if (task.assignmentScope === 'SPECIFIC_USER' && task.assignedTo) {
      const jinete = jinetes.find(j => j.uid === task.assignedTo);
      return jinete?.displayName || task.assignedTo.substring(0,6)+"...";
    }
    if (task.assignmentScope === 'ALL_MEMBERS_INDIVIDUALLY') return "Todos (Individual)";
    if (task.assignmentScope === 'ANYONE_IN_STABLE') return "Cualquiera en la cuadra";
    return "No asignada"; 
  };
  
  const currentSelectValue = assignmentScope === 'SPECIFIC_USER' ? (assignedTo || "") : assignmentScope;

  // Protección temprana contra renderizado durante desmontaje
  if (!isMounted) {
    return null;
  }

  if (authLoading || !activeStableId ) { 
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  
  if (!activeStableId && !authLoading) {
    return (
      <StableWrapper>
        <Alert variant="default" className="max-w-lg mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{tTasks('noActiveStable')}</AlertTitle>
          <AlertDescription>
          {tTasks('pleaseJoin')} <Link href="/profile" className="text-primary underline">{tTasks('createOrSelectStable')}</Link> {tTasks('toManageTasks')}
          </AlertDescription>
        </Alert>
      </StableWrapper>
    );
  }
  
  if (error && !isLoading) { 
    return (
      <StableWrapper>
        <Alert variant="destructive" className="max-w-lg mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </StableWrapper>
    );
  }

  return (
    <StableWrapper className="container mx-auto py-8 space-y-8">
      {/* NUEVO: Selector de fecha para filtrar tareas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-6 w-6" />
            Filtrar Tareas por Día
          </CardTitle>
          <CardDescription>
            Selecciona un día para ver solo las tareas programadas para esa fecha
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex-1">
              <Label htmlFor="dateFilter">Fecha Seleccionada</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="dateFilter"
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
                <span className="font-medium text-blue-700 dark:text-blue-300">Total: {dayStats.total}</span>
              </div>
              <div className="bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded-lg text-sm">
                <span className="font-medium text-green-700 dark:text-green-300">Completadas: {dayStats.completed}</span>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/30 px-3 py-1 rounded-lg text-sm">
                <span className="font-medium text-yellow-700 dark:text-yellow-300">Pendientes: {dayStats.pending}</span>
              </div>
              {dayStats.overdue > 0 && (
                <div className="bg-red-50 dark:bg-red-900/30 px-3 py-1 rounded-lg text-sm">
                  <span className="font-medium text-red-700 dark:text-red-300">Vencidas: {dayStats.overdue}</span>
                </div>
              )}
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
            {editingTask ? tTasks('editTask') : tTasks('createNewTask')}
          </CardTitle>
          <CardDescription>
            {editingTask ? tTasks('modifyTaskDetails') : tTasks('assignNewTasks')}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmitTask}>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="descriptionJefeTareas">{tTasks('taskDescription')}</Label>
              <Textarea id="descriptionJefeTareas" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={tTasks('taskDescriptionPlaceholder')} required disabled={isSubmitting} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="assignmentTypeJefeTareas">Asignar a</Label>
                <Select 
                  value={currentSelectValue} 
                  onValueChange={handleAssignmentChange} 
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="assignmentTypeJefeTareas">
                    <SelectValue placeholder="Selecciona un tipo de asignación" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANYONE_IN_STABLE">Cualquiera en la cuadra</SelectItem>
                    <SelectItem value="ALL_MEMBERS_INDIVIDUALLY">Todos los miembros (individualmente)</SelectItem>
                    {jinetes.length > 0 ? jinetes.map(jinete => (
                      <SelectItem key={jinete.uid} value={jinete.uid}>{jinete.displayName}</SelectItem>
                    )) : <SelectItem value="no-jinetes" disabled>No hay miembros para asignación específica</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dueDateJefeTareas">Fecha de Entrega (Opcional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="dueDateJefeTareas"
                      variant={"outline"}
                      className={`w-full justify-start text-left font-normal ${!dueDate && "text-muted-foreground"}`}
                      disabled={isSubmitting}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={dueDate} onSelect={(date) => setDueDate(date ? startOfDay(date) : undefined)} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            {editingTask && <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>Cancelar Edición</Button>}
            <Button type="submit" disabled={isSubmitting}>
              <Loader2 className={`mr-2 h-4 w-4 animate-spin ${isSubmitting ? 'opacity-100' : 'opacity-0 w-0 mr-0'}`} />
              {editingTask ? "Guardar Cambios" : "Crear Tarea"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-6 w-6" />
            Tareas para {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: es })}
          </CardTitle>
          <CardDescription>
            {filteredTasks.length === 0 
              ? `No hay tareas programadas para ${format(selectedDate, "dd/MM/yyyy", { locale: es })}`
              : `Mostrando ${filteredTasks.length} tarea${filteredTasks.length === 1 ? '' : 's'} para el día seleccionado`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
        { isLoading ? (<div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>) :
          filteredTasks.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-muted-foreground">No hay tareas programadas para este día.</p>
              <p className="text-sm text-muted-foreground">
                Puedes crear una nueva tarea arriba o seleccionar otro día en el filtro.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">Estado</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Sugerida a</TableHead>
                  <TableHead>Completada por</TableHead>
                  <TableHead>Fecha Límite</TableHead>
                  <TableHead>Creada</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.sort((a,b) => new Date(b.createdAt instanceof Timestamp ? b.createdAt.toDate() : b.createdAt).getTime() - new Date(a.createdAt instanceof Timestamp ? a.createdAt.toDate() : a.createdAt).getTime()).map((task) => {
                  const taskDueDate = task.dueDate ? (task.dueDate instanceof Timestamp ? task.dueDate.toDate() : new Date(task.dueDate)) : null;
                  const isOverdue = !task.isCompleted && taskDueDate && taskDueDate < startOfDay(new Date());
                  return (
                  <TableRow 
                    key={task.id} 
                    className={cn(
                      task.isCompleted ? "bg-green-50 dark:bg-green-900/30 opacity-70" : "",
                      isOverdue ? "bg-red-50 dark:bg-red-900/30 border-l-4 border-destructive" : ""
                    )}
                  >
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => toggleTaskCompletion(task)} disabled={isSubmitting} title={task.isCompleted ? "Marcar como pendiente" : "Marcar como completada"}>
                        {task.isCompleted ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium">
                      {isOverdue && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <AlertTriangle className="mr-2 inline h-4 w-4 text-destructive" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Esta tarea está vencida.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {task.description}
                    </TableCell>
                    <TableCell>{getAssignedToText(task)}</TableCell>
                    <TableCell>
                        {task.isCompleted && task.completedBy ? 
                            `${jinetes.find(j => j.uid === task.completedBy)?.displayName || task.completedBy.substring(0,6)+"..."} (${task.completedAt ? format(task.completedAt instanceof Timestamp ? task.completedAt.toDate() : new Date(task.completedAt), "dd/MM/yy HH:mm", { locale: es }) : 'N/A'})` 
                            : 'Pendiente'}
                    </TableCell>
                    <TableCell>{task.dueDate ? format(task.dueDate instanceof Timestamp ? task.dueDate.toDate() : new Date(task.dueDate), "dd/MM/yy", { locale: es }) : "N/A"}</TableCell>
                    <TableCell>{format(task.createdAt instanceof Timestamp ? task.createdAt.toDate() : new Date(task.createdAt) , "dd/MM/yy HH:mm", { locale: es })}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEditTask(task)} disabled={isSubmitting || task.isCompleted}>
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
                              Se eliminará permanentemente la tarea: "{task.description}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteTask(task.id)} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
                               <Loader2 className={`mr-2 h-4 w-4 animate-spin ${isSubmitting ? 'opacity-100' : 'opacity-0 w-0 mr-0'}`} />
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                )})}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </StableWrapper>
  );
}

    
