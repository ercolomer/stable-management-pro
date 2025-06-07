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

export default function MozoGestionTareasPage() {
  const db = getDb(); 
  const { userProfile, loading: authLoading, activeStableId } = useAuth();
  const { toast } = useToast();

  // Traducciones
  const t = useTranslations('common');
  const tTasks = useTranslations('tasks');

  // Estado para el filtro de fecha
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

  // Función para filtrar tareas por fecha seleccionada
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

  // Estadísticas para el día seleccionado
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
    
    if (userProfile && userProfile.role !== "mozo de cuadra") {
       setError(tTasks('accessDenied'));
       setIsLoading(false);
       return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      console.log(`[DEBUG] MozoGestionTareasPage - fetchData Diagnostics:`);
      console.log(`  Authenticated User UID (request.auth.uid): ${userProfile?.uid || 'N/A (profile not loaded)'}`);
      console.log(`  Querying for Stable ID (stableIdToUse): ${stableIdToUse}`);
      
      console.log(`GestionTareasPage (Mozo) - Fetching data for stableId: ${stableIdToUse}`);

      try {
          console.log("GestionTareasPage (Mozo) - Fetching data from Firestore.");
          const stableDocRef = doc(db, "stables", stableIdToUse);
          console.log("GestionTareasPage (Mozo) - Querying stable document:", { path: `stables/${stableIdToUse}` });
          const stableDocSnap = await getDoc(stableDocRef);
          if (!stableDocSnap.exists()) throw new Error("Cuadra no encontrada.");
          const stableData = stableDocSnap.data() as Stable;
          const memberIds = stableData.members; 
          
          if (memberIds.length > 0) {
            console.log("GestionTareasPage (Mozo) - Querying users collection for members:", { uids: memberIds });
            const usersQuery = query(collection(db, "users"), where("uid", "in", memberIds));
            const usersSnapshot = await getDocs(usersQuery);
            setJinetesEnCuadra(usersSnapshot.docs.map(d => d.data() as UserProfile));
          } else {
            setJinetesEnCuadra([]);
          }
          
          console.log("GestionTareasPage (Mozo) - Querying tasks collection:", { collection: "tasks", where: `stableId == ${stableIdToUse}` });
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
        const taskDocRef = doc(db, "tasks", editingTask.id);
        await updateDoc(taskDocRef, {
          ...taskDataForFirestore,
          updatedAt: serverTimestamp(),
        });
        setTasks(prev => prev.map(t => 
          t.id === editingTask.id 
            ? { ...taskDataForStateUpdate, id: editingTask.id, createdAt: editingTask.createdAt, updatedAt: new Date() } as DailyTask 
            : t
        ));
        if(toast) toast({ title: t('success'), description: tTasks('taskUpdated') });
      } else {
        const tasksCollectionRef = collection(db, "tasks");
        const docRef = await addDoc(tasksCollectionRef, {
          ...taskDataForFirestore,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setTasks(prev => [...prev, { ...taskDataForStateUpdate, id: docRef.id, createdAt: new Date(), updatedAt: new Date() } as DailyTask]);
        if(toast) toast({ title: t('success'), description: tTasks('taskCreated') });
      }
      resetForm();
    } catch (err: any) {
      console.error("Error al guardar tarea:", err);
      if(toast) toast({ title: t('error'), description: `${tTasks('errorSavingTask')} ${err.message}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTask = (task: DailyTask) => {
    setEditingTask(task);
    setDescription(task.description);
    setAssignmentScope(task.assignmentScope);
    setAssignedTo(task.assignedTo);
    setDueDate(task.dueDate ? (task.dueDate instanceof Date ? task.dueDate : task.dueDate instanceof Timestamp ? task.dueDate.toDate() : new Date(task.dueDate)) : undefined);
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const taskDocRef = doc(db, "tasks", taskId);
      await deleteDoc(taskDocRef);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      if(toast) toast({ title: t('success'), description: tTasks('taskDeleted') });
    } catch (err: any) {
      console.error("Error al eliminar tarea:", err);
      if(toast) toast({ title: t('error'), description: `${tTasks('errorDeletingTask')} ${err.message}`, variant: "destructive" });
    }
  };

  const toggleTaskCompletion = async (task: DailyTask) => {
    const isCompleting = !task.isCompleted;
    
    try {
      const taskDocRef = doc(db, "tasks", task.id);
      const updateData: any = {
        isCompleted: isCompleting,
        updatedAt: serverTimestamp(),
      };
      
      if (isCompleting) {
        updateData.completedBy = userProfile?.uid || null;
        updateData.completedAt = serverTimestamp();
      } else {
        updateData.completedBy = null;
        updateData.completedAt = null;
      }
      
      await updateDoc(taskDocRef, updateData);
      
      setTasks(prev => prev.map(t => 
        t.id === task.id 
          ? { 
              ...t, 
              isCompleted: isCompleting,
              completedBy: isCompleting ? (userProfile?.uid || null) : null,
              completedAt: isCompleting ? new Date() : undefined,
              updatedAt: new Date(),
            } 
          : t
      ));
      
      if(toast) toast({ 
        title: t('success'), 
        description: isCompleting ? tTasks('taskCompleted') : tTasks('taskReopened') 
      });
    } catch (err: any) {
      console.error("Error al actualizar tarea:", err);
      if(toast) toast({ title: t('error'), description: `${tTasks('errorUpdatingTask')} ${err.message}`, variant: "destructive" });
    }
  };

  const getAssignedToText = (task: DailyTask) => {
    if (task.assignmentScope === 'ANYONE_IN_STABLE') {
      return tTasks('anyoneInStable');
    } else if (task.assignmentScope === 'ALL_MEMBERS_INDIVIDUALLY') {
      return tTasks('everyoneIndividually');
    } else if (task.assignedTo) {
      const assignee = jinetesEnCuadra.find(j => j.uid === task.assignedTo);
      return assignee ? assignee.displayName : tTasks('unknownUser');
    }
    return tTasks('notAssigned');
  };

  const getTaskStatusIcon = (task: DailyTask) => {
    if (task.isCompleted) {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    
    if (task.dueDate) {
      const today = startOfDay(new Date());
      const dueDate = task.dueDate instanceof Timestamp ? task.dueDate.toDate() : new Date(task.dueDate);
      const dueDateStart = startOfDay(dueDate);
      
      if (dueDateStart < today) {
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      }
    }
    
    return <Circle className="h-4 w-4 text-gray-400" />;
  };

  if (isLoading || authLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>;
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 text-center">
        <Alert variant="destructive" className="max-w-lg mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>{error} <Link href="/profile" className="text-primary underline">{t('goToProfile')}</Link> {t('toConfigure')}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">{tTasks('taskManagement')} - {tTasks('stableHandRoleTitle')}</h1>
        </div>

        {/* NUEVO: Card para filtro de fecha y estadísticas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
            </CardTitle>
            <CardDescription>
              {tTasks('selectDateToViewTasks')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date())}
                className={cn(
                  startOfDay(selectedDate).getTime() === startOfDay(new Date()).getTime() && "bg-primary text-primary-foreground"
                )}
              >
                {tTasks('today')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  setSelectedDate(tomorrow);
                }}
                className={cn(
                  startOfDay(selectedDate).getTime() === startOfDay(new Date(Date.now() + 24 * 60 * 60 * 1000)).getTime() && "bg-primary text-primary-foreground"
                )}
              >
                {tTasks('tomorrow')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const nextWeek = new Date();
                  nextWeek.setDate(nextWeek.getDate() + 7);
                  setSelectedDate(nextWeek);
                }}
              >
                {tTasks('nextWeek')}
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {tTasks('selectDateButton')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            {/* Estadísticas del día */}
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm">
                <span className="font-medium">{tTasks('totalColon')}</span> {dayStats.total}
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-md text-sm">
                <CheckCircle2 className="h-3 w-3" />
                <span className="font-medium">{tTasks('completedColon')}</span> {dayStats.completed}
              </div>
              <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md text-sm">
                <Circle className="h-3 w-3" />
                <span className="font-medium">{tTasks('pendingColon')}</span> {dayStats.pending}
              </div>
              {dayStats.overdue > 0 && (
                <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-md text-sm">
                  <AlertTriangle className="h-3 w-3" />
                  <span className="font-medium">{tTasks('overdueColon')}</span> {dayStats.overdue}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5" />
                {editingTask ? tTasks('editTask') : tTasks('createTask')}
              </CardTitle>
              <CardDescription>
                {editingTask ? tTasks('modifyTaskDetails') : tTasks('addNewTaskToday')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitTask} className="space-y-4">
                <div>
                  <Label htmlFor="description">{tTasks('description')}</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={tTasks('taskDescriptionPlaceholder')}
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="assignment">{tTasks('assignment')}</Label>
                  <Select onValueChange={handleAssignmentChange} value={assignmentScope === 'SPECIFIC_USER' ? assignedTo || '' : assignmentScope}>
                    <SelectTrigger>
                      <SelectValue placeholder={tTasks('selectAssignment')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ANYONE_IN_STABLE">{tTasks('anyoneInStable')}</SelectItem>
                      <SelectItem value="ALL_MEMBERS_INDIVIDUALLY">{tTasks('everyoneIndividually')}</SelectItem>
                      {jinetesEnCuadra.map(jinete => (
                        <SelectItem key={jinete.uid} value={jinete.uid}>{jinete.displayName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="dueDate">{tTasks('dueDate')}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dueDate ? format(dueDate, "d 'de' MMMM 'de' yyyy", { locale: es }) : tTasks('selectDate')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dueDate}
                        onSelect={setDueDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button type="submit" disabled={isSubmitting} className="flex-1">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingTask ? tTasks('updateTask') : tTasks('createTask')}
                  </Button>
                  {editingTask && (
                    <Button type="button" variant="outline" onClick={resetForm}>
                      {tTasks('cancel')}
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-5 w-5" />
                {tTasks('tasksForDate')} {format(selectedDate, "d/M/yyyy")}
              </CardTitle>
                          <CardDescription>
              {filteredTasks.length === 0 
                ? `${tTasks('noTasksForSelectedDate')} ${format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}`
                : `${filteredTasks.length} ${filteredTasks.length === 1 ? tTasks('foundTasks') : tTasks('foundTasksPlural')}`
              }
            </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ListChecks className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay tareas para esta fecha</p>
                  <p className="text-sm">¡Crea una nueva tarea arriba!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTasks.map(task => (
                    <div key={task.id} className={cn(
                      "p-3 rounded-lg border transition-all hover:shadow-sm",
                      task.isCompleted ? "bg-green-50 border-green-200" : "bg-card border-border"
                    )}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 hover:bg-transparent"
                                  onClick={() => toggleTaskCompletion(task)}
                                >
                                  {getTaskStatusIcon(task)}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {task.isCompleted ? tTasks('markAsIncomplete') : tTasks('markAsComplete')}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-sm break-words",
                              task.isCompleted && "line-through text-muted-foreground"
                            )}>
                              {task.description}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span>{getAssignedToText(task)}</span>
                              {task.dueDate && (
                                <span>• {format(task.dueDate instanceof Timestamp ? task.dueDate.toDate() : new Date(task.dueDate), "d/M/yyyy")}</span>
                              )}
                              {task.isCompleted && task.completedAt && (
                                <span className="text-green-600">
                                  • Completada {format(task.completedAt instanceof Timestamp ? task.completedAt.toDate() : (task.completedAt instanceof Date ? task.completedAt : new Date(task.completedAt)), "d/M/yyyy 'a las' HH:mm")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleEditTask(task)}>
                                  <Edit2 className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{tTasks('editTask')}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          
                          <AlertDialog>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive">
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent>{tTasks('deleteTask')}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>{tTasks('confirmDeletion')}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  {tTasks('deleteTaskWarning')}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{tTasks('cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteTask(task.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  {tTasks('delete')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabla de todas las tareas para referencia */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListChecks className="h-5 w-5" />
              {tTasks('allTasks')}
            </CardTitle>
            <CardDescription>
              Vista completa de todas las tareas de la cuadra (filtradas por fecha arriba)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ListChecks className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{tTasks('noTasksYet')}</p>
                <p className="text-sm">{tTasks('createFirstTask')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">{tTasks('status')}</TableHead>
                      <TableHead>{tTasks('description')}</TableHead>
                      <TableHead>{tTasks('assignment')}</TableHead>
                      <TableHead>{tTasks('dueDate')}</TableHead>
                      <TableHead className="w-[100px]">{tTasks('actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map(task => (
                      <TableRow key={task.id} className={task.isCompleted ? "opacity-75" : ""}>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => toggleTaskCompletion(task)}
                                >
                                  {getTaskStatusIcon(task)}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {task.isCompleted ? tTasks('markAsIncomplete') : tTasks('markAsComplete')}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell className={task.isCompleted ? "line-through" : ""}>
                          {task.description}
                        </TableCell>
                        <TableCell>{getAssignedToText(task)}</TableCell>
                        <TableCell>
                          {task.dueDate ? format(task.dueDate instanceof Timestamp ? task.dueDate.toDate() : new Date(task.dueDate), "d/M/yyyy", { locale: es }) : tTasks('noDate')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleEditTask(task)}>
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{tTasks('editTask')}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            <AlertDialog>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive hover:text-destructive">
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </AlertDialogTrigger>
                                  </TooltipTrigger>
                                  <TooltipContent>{tTasks('deleteTask')}</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>{tTasks('confirmDeletion')}</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    {tTasks('deleteTaskWarning')}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>{tTasks('cancel')}</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteTask(task.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    {tTasks('delete')}
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 