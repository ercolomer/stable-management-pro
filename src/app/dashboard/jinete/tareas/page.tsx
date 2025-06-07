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
import { useTranslations } from 'next-intl';


export default function JineteGestionTareasPage() {
  const db = getDb(); 
  const { userProfile, loading: authLoading, activeStableId } = useAuth();
  const { toast } = useToast();

  // Traducciones
  const t = useTranslations('common');
  const tTasks = useTranslations('tasks');
  


  // NUEVO: Estado para el filtro de fecha
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const [jinetesEnCuadra, setJinetesEnCuadra] = useState<UserProfile[]>([]); 
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
    if (authLoading) return;

    const stableIdToUse = activeStableId;

    if (!stableIdToUse) {
      setError(tTasks('notAssignedToStable'));
      setIsLoading(false);
      return;
    }
    
    if (userProfile && userProfile.role !== "jinete") {
       setError(tTasks('accessDenied'));
       setIsLoading(false);
       return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      console.log(`[DEBUG] JineteGestionTareasPage - fetchData Diagnostics:`);
      console.log(`  Authenticated User UID (request.auth.uid): ${userProfile?.uid || 'N/A (profile not loaded)'}`);
      console.log(`  Querying for Stable ID (stableIdToUse): ${stableIdToUse}`);
      
      console.log(`GestionTareasPage (Jinete) - Fetching data for stableId: ${stableIdToUse}`);

      try {
          console.log("GestionTareasPage (Jinete) - Fetching data from Firestore.");
          const stableDocRef = doc(db, "stables", stableIdToUse);
          console.log("GestionTareasPage (Jinete) - Querying stable document:", { path: `stables/${stableIdToUse}` });
          const stableDocSnap = await getDoc(stableDocRef);
          if (!stableDocSnap.exists()) throw new Error("Cuadra no encontrada.");
          const stableData = stableDocSnap.data() as Stable;
          const memberIds = stableData.members; 
          
          if (memberIds.length > 0) {
            console.log("GestionTareasPage (Jinete) - Querying users collection for members:", { uids: memberIds });
            const usersQuery = query(collection(db, "users"), where("uid", "in", memberIds));
            const usersSnapshot = await getDocs(usersQuery);
            setJinetesEnCuadra(usersSnapshot.docs.map(d => d.data() as UserProfile));
          } else {
            setJinetesEnCuadra([]);
          }
          
          console.log("GestionTareasPage (Jinete) - Querying tasks collection:", { collection: "tasks", where: `stableId == ${stableIdToUse}` });
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
          setTasks(fetchedTasks);
        
      } catch (err: any) {
        console.error("Error al cargar datos:", err);
        setError(`${tTasks('errorLoadingData')} ${err.message || ''} Código: ${err.code || 'N/A'}`);
        if (toast) {
          toast({ title: t('error'), description: `${tTasks('errorLoadingData')} Código: ${err.code || 'N/A'}. Mensaje: ${err.message || ''}`, variant: "destructive", duration: 7000});
        }
      } finally {
        setIsLoading(false);
      }
    };
    if (stableIdToUse) fetchData();
    else setIsLoading(false);
  }, [userProfile, authLoading, activeStableId, toast, db]);

  const handleAssignmentChange = (value: string) => {
    if (value === "ANYONE_IN_STABLE" || value === "ALL_MEMBERS_INDIVIDUALLY") {
      setAssignmentScope(value as AssignmentScope);
      setAssignedTo(null);
    } else {
      setAssignmentScope('SPECIFIC_USER');
      setAssignedTo(value);
    }
  };

  const resetForm = () => {
    setDescription("");
    setAssignedTo(undefined);
    setAssignmentScope('ANYONE_IN_STABLE');
    setDueDate(undefined);
    setEditingTask(null);
  };

  const handleSubmitTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const stableIdToUse = activeStableId;
    
    if (!description.trim()) {
      if(toast) toast({ title: t('error'), description: tTasks('taskDescription'), variant: "destructive" });
      return;
    }
     if (!stableIdToUse) {
        if(toast) toast({ title: t('error'), description: tTasks('noActiveStable'), variant: "destructive" });
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
      completedAt: editingTask?.completedAt instanceof Timestamp ? editingTask.completedAt.toDate() : (editingTask?.completedAt instanceof Date ? editingTask.completedAt : undefined),
    };


    try {
      if (editingTask) {
        const taskRef = doc(db, "tasks", editingTask.id);
        await updateDoc(taskRef, { ...taskDataForFirestore, updatedAt: serverTimestamp() });
        const finalTaskState = { ...editingTask, ...taskDataForStateUpdate, updatedAt: new Date() } as DailyTask;
        setTasks(tasks.map(t => t.id === editingTask.id ? finalTaskState : t).sort((a,b) => {
          const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toDate() : a.createdAt;
          const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toDate() : b.createdAt;
          const timeA = dateA ? new Date(dateA).getTime() : 0;
          const timeB = dateB ? new Date(dateB).getTime() : 0;
          return timeB - timeA;
        }));
        if(toast) toast({ title: tTasks('taskUpdated'), description: "La tarea ha sido modificada." });
      } else {
        const docRef = await addDoc(collection(db, "tasks"), { ...taskDataForFirestore, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        const finalTaskState = { ...taskDataForStateUpdate, id: docRef.id, createdAt: new Date(), updatedAt: new Date() } as DailyTask;
        setTasks([{ ...finalTaskState }, ...tasks].sort((a,b) => {
          const dateA = a.createdAt instanceof Timestamp ? a.createdAt.toDate() : a.createdAt;
          const dateB = b.createdAt instanceof Timestamp ? b.createdAt.toDate() : b.createdAt;
          const timeA = dateA ? new Date(dateA).getTime() : 0;
          const timeB = dateB ? new Date(dateB).getTime() : 0;
          return timeB - timeA;
        }));
        if(toast) toast({ title: tTasks('taskCreated'), description: "La nueva tarea ha sido asignada." });
      }
      resetForm();
    } catch (err: any) {
      console.error("Error al guardar tarea:", err);
      if(toast) toast({ title: t('error'), description: `${editingTask ? tTasks('errorUpdating') : tTasks('errorCreating')} ${err.message || ''} Código: ${err.code || 'N/A'}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTask = (task: DailyTask) => {
    setEditingTask(task);
    setDescription(task.description);
    setAssignmentScope(task.assignmentScope || (task.assignedTo ? 'SPECIFIC_USER' : 'ANYONE_IN_STABLE'));
    setAssignedTo(task.assignedTo);
    setDueDate(task.dueDate ? (task.dueDate instanceof Timestamp ? task.dueDate.toDate() : new Date(task.dueDate)) : undefined);
  };

  const handleDeleteTask = async (taskId: string) => {
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, "tasks", taskId));
      setTasks(tasks.filter(t => t.id !== taskId));
      if(toast) toast({ title: tTasks('taskDeleted'), description: "La tarea ha sido eliminada." });
    } catch (err: any) {
      console.error("Error al eliminar tarea:", err);
      if(toast) toast({ title: t('error'), description: `${tTasks('errorDeleting')} ${err.message || ''} Código: ${err.code || 'N/A'}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const toggleTaskCompletion = async (task: DailyTask) => {
    if (!userProfile) return;
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
      setTasks(tasks.map(t => t.id === task.id ? taskForStateUpdate : t));
      if(toast) toast({ title: newCompletedStatus ? tTasks('taskMarkedCompleted') : tTasks('taskMarkedPending') });
    } catch (error: any) {
      console.error("Error al actualizar estado de tarea:", error);
      if(toast) toast({ title: t('error'), description: `${tTasks('errorToggling')} ${error.message || ''} Código: ${error.code || 'N/A'}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAssignedToText = (task: DailyTask) => {
    if (task.assignmentScope === 'SPECIFIC_USER' && task.assignedTo) {
      const jinete = jinetesEnCuadra.find(j => j.uid === task.assignedTo);
      return jinete?.displayName || task.assignedTo.substring(0,6)+"...";
    }
    if (task.assignmentScope === 'ALL_MEMBERS_INDIVIDUALLY') return tTasks('allMembersIndividually');
    if (task.assignmentScope === 'ANYONE_IN_STABLE') return tTasks('anyoneInStable');
    return "No asignada"; 
  };
  
  const currentSelectValue = assignmentScope === 'SPECIFIC_USER' ? (assignedTo || "") : assignmentScope;


  if (authLoading || !activeStableId) { 
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }
  
  if (!activeStableId && !authLoading) {
    return (
        <Alert variant="default" className="max-w-lg mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{tTasks('noActiveStable')}</AlertTitle>
            <AlertDescription>
            {tTasks('pleaseJoin')} <Link href="/profile" className="text-primary underline">{tTasks('joinStableLink')}</Link> {tTasks('toManageTasks')}
            </AlertDescription>
        </Alert>
    );
  }
  
  if (error && !isLoading) { 
    return <Alert variant="destructive" className="max-w-lg mx-auto"><AlertCircle className="h-4 w-4" /><AlertTitle>{t('error')}</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* NUEVO: Selector de fecha para filtrar tareas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-6 w-6" />
            {tTasks('filterByDay')}
          </CardTitle>
          <CardDescription>
            {tTasks('selectDayToFilter')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex-1">
              <Label htmlFor="dateFilter">{tTasks('selectedDate')}</Label>
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
                <span className="font-medium text-blue-700 dark:text-blue-300">{tTasks('totalColon')} {dayStats.total}</span>
              </div>
              <div className="bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded-lg text-sm">
                <span className="font-medium text-green-700 dark:text-green-300">{tTasks('completedColon')} {dayStats.completed}</span>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/30 px-3 py-1 rounded-lg text-sm">
                <span className="font-medium text-yellow-700 dark:text-yellow-300">{tTasks('pendingColon')} {dayStats.pending}</span>
              </div>
              {dayStats.overdue > 0 && (
                <div className="bg-red-50 dark:bg-red-900/30 px-3 py-1 rounded-lg text-sm">
                  <span className="font-medium text-red-700 dark:text-red-300">{tTasks('overdueColon')} {dayStats.overdue}</span>
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
              {tTasks('today')}
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
              {tTasks('tomorrow')}
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
              {tTasks('nextWeek')}
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
              <Label htmlFor="descriptionJineteTareas">{tTasks('taskDescription')}</Label>
              <Textarea id="descriptionJineteTareas" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={tTasks('taskPlaceholder')} required disabled={isSubmitting} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="assignmentTypeJineteTareas">{tTasks('assignTo')}</Label>
                 <Select 
                  value={currentSelectValue} 
                  onValueChange={handleAssignmentChange} 
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="assignmentTypeJineteTareas">
                    <SelectValue placeholder={tTasks('selectAssignmentType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANYONE_IN_STABLE">{tTasks('anyoneInStable')}</SelectItem>
                    <SelectItem value="ALL_MEMBERS_INDIVIDUALLY">{tTasks('allMembersIndividually')}</SelectItem>
                    {jinetesEnCuadra.length > 0 ? jinetesEnCuadra.map(jinete => (
                      <SelectItem key={jinete.uid} value={jinete.uid}>{jinete.displayName}</SelectItem>
                    )) : <SelectItem value="no-jinetes" disabled>{tTasks('noMembersForAssignment')}</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dueDateJineteTareas">{tTasks('dueDate')} ({tTasks('optional')})</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="dueDateJineteTareas"
                      variant={"outline"}
                      className={`w-full justify-start text-left font-normal ${!dueDate && "text-muted-foreground"}`}
                      disabled={isSubmitting}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP", { locale: es }) : <span>{tTasks('selectDate')}</span>}
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
            {editingTask && <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>{tTasks('cancelEdit')}</Button>}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingTask ? tTasks('saveChanges') : tTasks('addTask')}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-6 w-6" />
            {tTasks('tasksFor')} {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: es })}
          </CardTitle>
          <CardDescription>
            {filteredTasks.length === 0 
              ? tTasks('noTasksForSelectedDate') + " " + format(selectedDate, "dd/MM/yyyy", { locale: es })
              : `${tTasks('showingTasks')} ${filteredTasks.length} ${filteredTasks.length === 1 ? tTasks('taskSingular') : tTasks('taskPlural')} ${tTasks('forSelectedDay')}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
        { isLoading ? (<div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>) :
          filteredTasks.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-muted-foreground">{tTasks('noTasksForThisDate')}</p>
              <p className="text-sm text-muted-foreground">
                {tTasks('createNewTaskAbove')}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">{tTasks('status')}</TableHead>
                  <TableHead>{tTasks('taskDescription')}</TableHead>
                  <TableHead>{tTasks('assignedTo')}</TableHead>
                  <TableHead>{tTasks('completedBy')}</TableHead>
                  <TableHead>{tTasks('dueDate')}</TableHead>
                  <TableHead>{tTasks('created')}</TableHead>
                  <TableHead className="text-right">{tTasks('actions')}</TableHead>
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
                      <Button variant="ghost" size="icon" onClick={() => toggleTaskCompletion(task)} disabled={isSubmitting} title={task.isCompleted ? tTasks('markPending') : tTasks('markCompleted')}>
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
                              <p>{tTasks('taskOverdue')}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                      {task.description}
                    </TableCell>
                    <TableCell>{getAssignedToText(task)}</TableCell>
                     <TableCell>
                        {task.isCompleted && task.completedBy ? 
                            `${jinetesEnCuadra.find(j => j.uid === task.completedBy)?.displayName || task.completedBy.substring(0,6)+"..."} (${task.completedAt ? format(task.completedAt instanceof Timestamp ? task.completedAt.toDate() : new Date(task.completedAt), "dd/MM/yy HH:mm", { locale: es }) : 'N/A'})` 
                            : tTasks('pending')}
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
                            <AlertDialogTitle>{tTasks('confirmDelete')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {tTasks('deleteConfirmMessage')} "{task.description}".
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel disabled={isSubmitting}>{t('cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteTask(task.id)} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
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

    
