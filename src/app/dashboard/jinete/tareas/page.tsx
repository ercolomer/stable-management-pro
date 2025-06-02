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


export default function JineteGestionTareasPage() {
  const db = getDb(); 
  const { userProfile, loading: authLoading, activeStableId } = useAuth();
  const { toast } = useToast();

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

  useEffect(() => {
    if (authLoading) return;

    const stableIdToUse = activeStableId;

    if (!stableIdToUse) {
      setError("No estás asignado a ninguna cuadra. Únete a una para gestionar tareas.");
      setIsLoading(false);
      return;
    }
    
    if (userProfile && userProfile.role !== "jinete") {
       setError("Acceso denegado. Debes ser jinete.");
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
        setError(`No se pudo cargar la información necesaria. ${err.message || ''} Código: ${err.code || 'N/A'}`);
        if (toast) {
          toast({ title: "Error de Carga", description: `No se pudo cargar la información de tareas. Código: ${err.code || 'N/A'}. Mensaje: ${err.message || ''}`, variant: "destructive", duration: 7000});
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
      if(toast) toast({ title: "Error", description: "La descripción de la tarea es requerida.", variant: "destructive" });
      return;
    }
     if (!stableIdToUse) {
        if(toast) toast({ title: "Error", description: "No se pudo determinar la cuadra para guardar la tarea.", variant: "destructive" });
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
        if(toast) toast({ title: "Tarea Actualizada", description: "La tarea ha sido modificada." });
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
        if(toast) toast({ title: "Tarea Creada", description: "La nueva tarea ha sido asignada." });
      }
      resetForm();
    } catch (err: any) {
      console.error("Error al guardar tarea:", err);
      if(toast) toast({ title: "Error", description: `No se pudo guardar la tarea. ${err.message || ''} Código: ${err.code || 'N/A'}`, variant: "destructive" });
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
      if(toast) toast({ title: "Tarea Eliminada", description: "La tarea ha sido eliminada." });
    } catch (err: any) {
      console.error("Error al eliminar tarea:", err);
      if(toast) toast({ title: "Error", description: `No se pudo eliminar la tarea. ${err.message || ''} Código: ${err.code || 'N/A'}`, variant: "destructive" });
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
      if(toast) toast({ title: "Estado de Tarea Actualizado" });
    } catch (error: any) {
      console.error("Error al actualizar estado de tarea:", error);
      if(toast) toast({ title: "Error", description: `No se pudo actualizar el estado. ${error.message || ''} Código: ${error.code || 'N/A'}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAssignedToText = (task: DailyTask) => {
    if (task.assignmentScope === 'SPECIFIC_USER' && task.assignedTo) {
      const jinete = jinetesEnCuadra.find(j => j.uid === task.assignedTo);
      return jinete?.displayName || task.assignedTo.substring(0,6)+"...";
    }
    if (task.assignmentScope === 'ALL_MEMBERS_INDIVIDUALLY') return "Todos (Individual)";
    if (task.assignmentScope === 'ANYONE_IN_STABLE') return "Cualquiera en la cuadra";
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
            <AlertTitle>No tienes una cuadra activa</AlertTitle>
            <AlertDescription>
            Por favor, <Link href="/profile" className="text-primary underline">únete a una cuadra</Link> para gestionar tareas.
            </AlertDescription>
        </Alert>
    );
  }
  
  if (error && !isLoading) { 
    return <Alert variant="destructive" className="max-w-lg mx-auto"><AlertCircle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusCircle className="h-6 w-6" />
            {editingTask ? "Editar Tarea de Cuadra" : "Crear Nueva Tarea de Cuadra"}
          </CardTitle>
          <CardDescription>
            {editingTask ? "Modifica los detalles de la tarea." : "Asigna nuevas tareas a los miembros de la cuadra."}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmitTask}>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="descriptionJineteTareas">Descripción de la Tarea</Label>
              <Textarea id="descriptionJineteTareas" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ej: Limpiar equipo de salto" required disabled={isSubmitting} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="assignmentTypeJineteTareas">Asignar a</Label>
                 <Select 
                  value={currentSelectValue} 
                  onValueChange={handleAssignmentChange} 
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="assignmentTypeJineteTareas">
                    <SelectValue placeholder="Selecciona un tipo de asignación" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANYONE_IN_STABLE">Cualquiera en la cuadra</SelectItem>
                    <SelectItem value="ALL_MEMBERS_INDIVIDUALLY">Todos los miembros (individualmente)</SelectItem>
                    {jinetesEnCuadra.length > 0 ? jinetesEnCuadra.map(jinete => (
                      <SelectItem key={jinete.uid} value={jinete.uid}>{jinete.displayName}</SelectItem>
                    )) : <SelectItem value="no-jinetes" disabled>No hay miembros para asignación específica</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dueDateJineteTareas">Fecha de Entrega (Opcional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="dueDateJineteTareas"
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
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingTask ? "Guardar Cambios" : "Crear Tarea"}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-6 w-6" />
            Tareas de la Cuadra
          </CardTitle>
          <CardDescription>Lista de todas las tareas actuales en la cuadra.</CardDescription>
        </CardHeader>
        <CardContent>
        { isLoading ? (<div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>) :
          tasks.length === 0 ? (
            <p className="text-muted-foreground">No hay tareas asignadas por el momento.</p>
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
                {tasks.sort((a,b) => new Date(b.createdAt instanceof Timestamp ? b.createdAt.toDate() : b.createdAt).getTime() - new Date(a.createdAt instanceof Timestamp ? a.createdAt.toDate() : a.createdAt).getTime()).map((task) => {
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
                            `${jinetesEnCuadra.find(j => j.uid === task.completedBy)?.displayName || task.completedBy.substring(0,6)+"..."} (${task.completedAt ? format(task.completedAt instanceof Timestamp ? task.completedAt.toDate() : new Date(task.completedAt), "dd/MM/yy HH:mm", { locale: es }) : 'N/A'})` 
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

    
