"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { getDb } from "@/lib/firebase/config";
import { collection, addDoc, getDocs, query, where, doc, updateDoc, deleteDoc, serverTimestamp, Timestamp, getDoc } from "firebase/firestore";
import type { Horse, HorseAssignment, HistoricalStay, HistoricalStayForm, UserProfile, Stable } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, PawPrint, PlusCircle, Edit2, Trash2, AlertCircle, CalendarIcon, X, CalendarDays, ChevronDown, ChevronUp, History, Trash } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, isSameDay, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import Link from "next/link";
import { useTranslations } from 'next-intl';
import StableWrapper from "@/components/stable-wrapper";

export default function GestionCaballosPage() {
  const db = getDb();
  const { userProfile, loading: authLoading, activeStableId } = useAuth();
  const { toast } = useToast();

  // Traducciones
  const t = useTranslations('common');
  const tHorses = useTranslations('horses');

  // Estado para evitar errores de DOM durante desmontaje
  const [isMounted, setIsMounted] = useState(true);

  // Estados principales
  const [horses, setHorses] = useState<Horse[]>([]);
  const [jinetes, setJinetes] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados del formulario - memoizados para estabilidad
  const [horseName, setHorseName] = useState("");
  const [horseBreed, setHorseBreed] = useState("");
  const [horseAge, setHorseAge] = useState<number | string>("");
  const [horseNotes, setHorseNotes] = useState("");
  const [horseImageUrl, setHorseImageUrl] = useState("");
  const [horseOwnerName, setHorseOwnerName] = useState("");
  const [horseEntryDate, setHorseEntryDate] = useState<Date | undefined>(undefined);
  const [horseExitDate, setHorseExitDate] = useState<Date | undefined>(undefined);
  const [horseFarrierDueDate, setHorseFarrierDueDate] = useState<Date | undefined>(undefined);
  const [horseEquipmentLocation, setHorseEquipmentLocation] = useState("");
  const [horseAdditionalCareNotes, setHorseAdditionalCareNotes] = useState("");
  const [editingHorse, setEditingHorse] = useState<Horse | null>(null);
  const [showHorseForm, setShowHorseForm] = useState(false);

  const [horseHistoricalStays, setHorseHistoricalStays] = useState<HistoricalStayForm[]>([]);
  const [newHistoricalEntryDate, setNewHistoricalEntryDate] = useState<Date | undefined>(undefined);
  const [newHistoricalExitDate, setNewHistoricalExitDate] = useState<Date | undefined>(undefined);
  const [newHistoricalNotes, setNewHistoricalNotes] = useState("");

  const [selectedHorseForCalendar, setSelectedHorseForCalendar] = useState<Horse | null>(null);
  const [horseAssignmentsForCalendar, setHorseAssignmentsForCalendar] = useState<HorseAssignment[]>([]);
  const [isCalendarLoading, setIsCalendarLoading] = useState(false);
  const [selectedDateForDetails, setSelectedDateForDetails] = useState<Date | null>(null);
  const [activityCalendarMonth, setActivityCalendarMonth] = useState<Date>(new Date());

  // Funciones memoizadas para estabilidad
  const normalizeHorseDatesForState = useCallback((horse: Horse): Horse => {
    const normalized = {
        ...horse,
        entryDate: horse.entryDate ? startOfDay(horse.entryDate instanceof Timestamp ? horse.entryDate.toDate() : new Date(horse.entryDate)) : undefined,
        exitDate: horse.exitDate ? startOfDay(horse.exitDate instanceof Timestamp ? horse.exitDate.toDate() : new Date(horse.exitDate)) : undefined,
        farrierDueDate: horse.farrierDueDate ? startOfDay(horse.farrierDueDate instanceof Timestamp ? horse.farrierDueDate.toDate() : new Date(horse.farrierDueDate)) : undefined,
        historicalStays: horse.historicalStays?.map(stay => ({
            ...stay,
            entryDate: startOfDay(stay.entryDate instanceof Timestamp ? stay.entryDate.toDate() : new Date(stay.entryDate)),
            exitDate: stay.exitDate ? startOfDay(stay.exitDate instanceof Timestamp ? stay.exitDate.toDate() : new Date(stay.exitDate)) : undefined,
        })) || [],
        createdAt: horse.createdAt ? (horse.createdAt instanceof Timestamp ? horse.createdAt.toDate() : new Date(horse.createdAt)) : undefined,
        updatedAt: horse.updatedAt ? (horse.updatedAt instanceof Timestamp ? horse.updatedAt.toDate() : new Date(horse.updatedAt)) : undefined,
    };
    if (normalized.historicalStays) {
        normalized.historicalStays = normalized.historicalStays.map(stay => ({
            notes: stay.notes,
            entryDate: new Date(stay.entryDate), 
            exitDate: stay.exitDate ? new Date(stay.exitDate) : undefined,
        }));
    }
    return normalized;
  }, []);
  
  const convertHorseDatesFromFirestore = useCallback((data: any): Horse => {
    return {
      ...data,
      entryDate: data.entryDate instanceof Timestamp ? data.entryDate.toDate() : (data.entryDate ? new Date(data.entryDate) : undefined),
      exitDate: data.exitDate instanceof Timestamp ? data.exitDate.toDate() : (data.exitDate ? new Date(data.exitDate) : undefined),
      farrierDueDate: data.farrierDueDate instanceof Timestamp ? data.farrierDueDate.toDate() : (data.farrierDueDate ? new Date(data.farrierDueDate) : undefined),
      historicalStays: data.historicalStays?.map((s: any) => ({
        ...s,
        entryDate: s.entryDate instanceof Timestamp ? s.entryDate.toDate() : new Date(s.entryDate),
        exitDate: s.exitDate ? (s.exitDate instanceof Timestamp ? s.exitDate.toDate() : new Date(s.exitDate)) : undefined,
      })) || [],
      createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date()),
      updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : new Date()),
    } as Horse;
  }, []);

  const getJineteNameForAssignment = useCallback((jineteId: string) => {
    const jinete = jinetes.find(j => j.uid === jineteId);
    return jinete?.displayName || `ID: ${jineteId.substring(0,6)}...`;
  }, [jinetes]);

  const resetForm = useCallback(() => {
    if (!isMounted) return;
    setHorseName(""); setHorseBreed(""); setHorseAge(""); setHorseNotes(""); setHorseImageUrl("");
    setHorseOwnerName(""); setHorseEntryDate(undefined); setHorseExitDate(undefined);
    setHorseFarrierDueDate(undefined); setHorseEquipmentLocation(""); setHorseAdditionalCareNotes("");
    setHorseHistoricalStays([]); setNewHistoricalEntryDate(undefined); setNewHistoricalExitDate(undefined); setNewHistoricalNotes("");
    setEditingHorse(null); setShowHorseForm(false);
  }, [isMounted]);

  useEffect(() => {
    setIsMounted(true);
    if (authLoading) return;
    if (!userProfile || userProfile.role !== "jefe de cuadra") {
      setError(tHorses('accessDenied'));
      setIsLoading(false);
      return;
    }
    
    if (!activeStableId) {
      setError(tHorses('createOrSelectStable'));
      setIsLoading(false);
      return;
    }

    const fetchHorsesAndJinetes = async () => {
      const currentStableId = activeStableId;
      if (!currentStableId) {
        if (!authLoading) {
          setError("No estás asignado a ninguna cuadra activa.");
          setHorses([]);
          setJinetes([]);
        }
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);

      try {
        const stableDocRef = doc(db, "stables", currentStableId);
        const stableDocSnap = await getDoc(stableDocRef);

        if (!stableDocSnap.exists()) {
          setError("No se encontró la cuadra activa.");
          setHorses([]);
          setJinetes([]);
          setIsLoading(false);
          return;
        }

        const stableData = stableDocSnap.data() as Stable;
        const horsesQuery = query(collection(db, "horses"), where("stableId", "==", currentStableId));
        const horsesQuerySnapshot = await getDocs(horsesQuery);
        const fetchedHorses = horsesQuerySnapshot.docs.map(doc => convertHorseDatesFromFirestore({id: doc.id, ...doc.data()}));

        const jineteIdsAprobados = stableData.members.filter(memberId => memberId !== stableData.ownerId);
        let fetchedJinetes: UserProfile[] = [];
        if (jineteIdsAprobados.length > 0) {
          const perfilesPromises = jineteIdsAprobados.map(id => getDoc(doc(db, "users", id)));
          const perfilesDocs = await Promise.all(perfilesPromises);
          fetchedJinetes = perfilesDocs.filter(docSnap => docSnap.exists()).map(docSnap => docSnap.data() as UserProfile);
        }

        // Solo actualizar estado si el componente sigue montado
        if (isMounted) {
          setHorses(fetchedHorses);
          setJinetes(fetchedJinetes);
        }
      } catch (err: any) {
        console.error("Error al cargar caballos y jinetes:", err);
        if (isMounted) {
          setError(`No se pudo cargar la lista de caballos. ${err.message || ''} Código: ${err.code || 'N/A'}`);
          if (toast) toast({ title: "Error de Carga", description: `No se pudo cargar la lista. Código: ${err.code || 'N/A'}. Mensaje: ${err.message || ''}`, variant: "destructive", duration: 7000 });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    fetchHorsesAndJinetes();
    return () => {
      setIsMounted(false);
    };
  }, [userProfile, authLoading, activeStableId, toast, db, convertHorseDatesFromFirestore, tHorses, isMounted]);

  useEffect(() => {
    if (selectedHorseForCalendar) {
      const fetchAssignments = async () => {
        if (!selectedHorseForCalendar || !isMounted) return;
        setIsCalendarLoading(true);
        try {
          const assignmentsQuery = query(collection(db, 'horseAssignments'), where('stableId', '==', activeStableId), where('horseName', '==', selectedHorseForCalendar.name));
          const assignmentsSnapshot = await getDocs(assignmentsQuery);
          const assignments = assignmentsSnapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            date: (doc.data().date as Timestamp).toDate()
          } as HorseAssignment));
          
          // Solo actualizar estado si el componente sigue montado
          if (isMounted) {
            setHorseAssignmentsForCalendar(assignments);
          }
        } catch (error) {
          console.error('Error fetching assignments:', error);
          if (isMounted && toast) {
            toast({ title: 'Error', description: 'No se pudieron cargar las asignaciones del caballo.', variant: 'destructive' });
          }
        } finally {
          if (isMounted) {
            setIsCalendarLoading(false);
          }
        }
      };
      fetchAssignments();
    } else {
      // Limpiar las asignaciones cuando no hay caballo seleccionado
      if (isMounted) {
        setHorseAssignmentsForCalendar([]);
        setSelectedDateForDetails(null);
      }
    }
  }, [selectedHorseForCalendar, activeStableId, db, toast, isMounted]);

   const handleAddHistoricalStay = useCallback(() => {
    if (!isMounted) return;
    
    if (!newHistoricalEntryDate && newHistoricalExitDate) {
      if (horseEntryDate && !horseExitDate) { 
        if (newHistoricalExitDate && startOfDay(newHistoricalExitDate) <= startOfDay(horseEntryDate)) {
          if(toast) toast({title: t('error'), description: "La fecha de salida debe ser posterior a la fecha de ingreso principal.", variant: "destructive"});
          return;
        }
        setHorseExitDate(newHistoricalExitDate ? startOfDay(newHistoricalExitDate) : undefined);
        if(toast) toast({title: "Salida Principal Actualizada", description: "La fecha de salida de la estancia principal se ha actualizada. Guarda los cambios del caballo."});
        setNewHistoricalEntryDate(undefined); setNewHistoricalExitDate(undefined); setNewHistoricalNotes("");
        return; 
      } else if (horseEntryDate && horseExitDate) {
         if(toast) toast({title: "Información", description: "La estancia principal ya tiene una fecha de salida. Edítala directamente o añade una nueva estancia histórica completa.", variant: "default", duration: 7000});
        return;
      } else if (!horseEntryDate) {
         if(toast) toast({title: "Falta Ingreso Principal", description: "Define primero la 'Fecha Ingreso Principal' o añade una estancia histórica completa.", variant: "destructive", duration: 7000});
        return;
      }
    }

    if (!newHistoricalEntryDate) {
      if(toast) toast({title: "Fecha de Ingreso Requerida", description: "La fecha de ingreso es obligatoria para añadir una nueva estancia histórica completa.", variant: "destructive"});
      return;
    }
    if (newHistoricalExitDate && newHistoricalEntryDate && startOfDay(newHistoricalEntryDate) >= startOfDay(newHistoricalExitDate)) {
      if(toast) toast({title: "Fechas Inválidas", description: "Para una estancia histórica, el ingreso debe ser anterior a la salida (si se proporciona salida).", variant: "destructive"});
      return;
    }

    setHorseHistoricalStays([...horseHistoricalStays, {
      entryDate: startOfDay(newHistoricalEntryDate),
      exitDate: newHistoricalExitDate ? startOfDay(newHistoricalExitDate) : undefined,
      notes: newHistoricalNotes.trim() || undefined,
    }]);
    setNewHistoricalEntryDate(undefined); setNewHistoricalExitDate(undefined); setNewHistoricalNotes("");
    if(toast) toast({title: "Estancia Añadida al Formulario", description: "Recuerda guardar los cambios del caballo."});
  }, [isMounted, newHistoricalEntryDate, newHistoricalExitDate, newHistoricalNotes, horseEntryDate, horseExitDate, horseHistoricalStays, toast, t]);

  const handleRemoveHistoricalStay = useCallback((indexToRemove: number) => {
    if (!isMounted) return;
    setHorseHistoricalStays(horseHistoricalStays.filter((_, index) => index !== indexToRemove));
     if(toast) toast({ title: "Estancia Eliminada del Formulario", description: "Recuerda guardar los cambios."});
  }, [isMounted, horseHistoricalStays, toast]);

  const handleSubmitHorse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isMounted) return; // Guard temprano
    setIsSubmitting(true);

    try {
      if (!userProfile || !activeStableId) {
        if (isMounted && toast) toast({ title: t('error'), description: tHorses('authRequired'), variant: 'destructive' });
        return;
      }

      if (!horseName.trim()) {
        if (isMounted && toast) toast({ title: t('error'), description: "El nombre del caballo es requerido.", variant: 'destructive' });
        return;
      }

      let finalHistoricalStays: HistoricalStayForm[] = [...horseHistoricalStays];
      
      if (horseEntryDate && horseExitDate && startOfDay(horseEntryDate) < startOfDay(horseExitDate)) {
          const mainStayCandidate: HistoricalStayForm = {
              entryDate: startOfDay(horseEntryDate),
              exitDate: startOfDay(horseExitDate),
              notes: editingHorse ? "Estancia principal (actualizada)" : "Estancia principal al crear",
          };
          const alreadyExists = finalHistoricalStays.some(
              stay => isSameDay(stay.entryDate, mainStayCandidate.entryDate) &&
                      ( (stay.exitDate && mainStayCandidate.exitDate && isSameDay(startOfDay(stay.exitDate), startOfDay(mainStayCandidate.exitDate))) || (!stay.exitDate && !mainStayCandidate.exitDate) )
          );
          if (!alreadyExists) {
              finalHistoricalStays.unshift(mainStayCandidate);
               if(toast) toast({ title: "Info", description: "Estancia principal añadida/actualizada en historial.", variant: "default", duration: 4000 });
          }
      } else if (horseEntryDate && !horseExitDate && !editingHorse) { 
        const mainStayCandidate: HistoricalStayForm = {
          entryDate: startOfDay(horseEntryDate),
          exitDate: undefined,
          notes: "Estancia principal al crear",
        };
        finalHistoricalStays.unshift(mainStayCandidate);
        if(toast) toast({ title: "Info", description: "Estancia principal (abierta) añadida al historial.", variant: "default", duration: 4000 });
      }


      const horseDataForFirestore = {
        stableId: activeStableId,
        name: horseName.trim(),
        breed: horseBreed.trim() || null,
        age: horseAge && !isNaN(Number(horseAge)) ? Number(horseAge) : null,
        notes: horseNotes.trim() || null,
        imageUrl: horseImageUrl.trim() || null,
        dataAiHint: horseBreed.trim().toLowerCase() || "horse",
        ownerName: horseOwnerName.trim() || null,
        entryDate: horseEntryDate ? Timestamp.fromDate(startOfDay(horseEntryDate)) : null,
        exitDate: horseExitDate ? Timestamp.fromDate(startOfDay(horseExitDate)) : null,
        farrierDueDate: horseFarrierDueDate ? Timestamp.fromDate(startOfDay(horseFarrierDueDate)) : null,
        equipmentLocation: horseEquipmentLocation.trim() || null,
        additionalCareNotes: horseAdditionalCareNotes.trim() || null,
        historicalStays: finalHistoricalStays.map(s => ({
          entryDate: Timestamp.fromDate(startOfDay(s.entryDate)),
          exitDate: s.exitDate ? Timestamp.fromDate(startOfDay(s.exitDate)) : null,
          notes: s.notes?.trim() || null,
        })),
      };

      if (editingHorse) {
        // Actualizar caballo existente
        await updateDoc(doc(db, 'horses', editingHorse.id), horseDataForFirestore);
        if (isMounted) {
          const updatedHorse = normalizeHorseDatesForState({ 
            id: editingHorse.id, 
            ...horseDataForFirestore 
          } as any);
          setHorses(prev => prev.map(h => h.id === editingHorse.id ? updatedHorse : h));
          if (toast) toast({ title: t('success'), description: tHorses('horseUpdated'), variant: 'default' });
          resetForm();
        }
      } else {
        // Crear nuevo caballo
        const docRef = await addDoc(collection(db, 'horses'), horseDataForFirestore);
        if (isMounted) {
          const newHorse = normalizeHorseDatesForState({ 
            id: docRef.id, 
            ...horseDataForFirestore 
          } as any);
          setHorses(prev => [...prev, newHorse]);
          if (toast) toast({ title: t('success'), description: tHorses('horseCreated'), variant: 'default' });
          resetForm();
        }
      }
    } catch (err: any) {
      console.error('Error saving horse:', err);
      if (isMounted && toast) {
        toast({ 
          title: t('error'), 
          description: editingHorse ? tHorses('errorUpdating') : tHorses('errorCreating'), 
          variant: 'destructive' 
        });
      }
    } finally {
      if (isMounted) {
        setIsSubmitting(false);
      }
    }
  };

  const handleEditHorse = useCallback((horse: Horse) => {
    if (!isMounted) return;
    
    const normalizedHorse = normalizeHorseDatesForState(horse); 
    setEditingHorse(normalizedHorse);
    setHorseName(normalizedHorse.name);
    setHorseBreed(normalizedHorse.breed || "");
    setHorseAge(normalizedHorse.age || "");
    setHorseNotes(normalizedHorse.notes || "");
    setHorseImageUrl(normalizedHorse.imageUrl || "");
    setHorseOwnerName(normalizedHorse.ownerName || "");
    
    // Convert Timestamps to Dates and null to undefined for form state
    const entryDate = normalizedHorse.entryDate instanceof Timestamp ? normalizedHorse.entryDate.toDate() : normalizedHorse.entryDate;
    setHorseEntryDate(entryDate === null ? undefined : entryDate);

    const exitDate = normalizedHorse.exitDate instanceof Timestamp ? normalizedHorse.exitDate.toDate() : normalizedHorse.exitDate;
    setHorseExitDate(exitDate === null ? undefined : exitDate);

    const farrierDate = normalizedHorse.farrierDueDate instanceof Timestamp ? normalizedHorse.farrierDueDate.toDate() : normalizedHorse.farrierDueDate;
    setHorseFarrierDueDate(farrierDate === null ? undefined : farrierDate);
    
    setHorseEquipmentLocation(normalizedHorse.equipmentLocation || "");
    setHorseAdditionalCareNotes(normalizedHorse.additionalCareNotes || "");
    setHorseHistoricalStays( 
      normalizedHorse.historicalStays?.map(s => {
        const stayEntryDate = s.entryDate instanceof Timestamp ? s.entryDate.toDate() : s.entryDate;
        const stayExitDate = s.exitDate instanceof Timestamp ? s.exitDate.toDate() : s.exitDate;
        return {
        ...s,
          // Aseguramos que solo pasamos un Date object o un valor que new Date() pueda manejar (como string/number)
          // Si ya es un Date, new Date() crea una copia. Si es null/undefined se manejará abajo.
          entryDate: stayEntryDate ? new Date(stayEntryDate) : undefined, 
          exitDate: stayExitDate ? new Date(stayExitDate) : undefined,
        };
      }).map(s => ({
        // Segunda pasada para asegurar que entryDate no sea undefined si debe ser Date
        // y para limpiar cualquier propiedad extra que no queramos en HistoricalStayForm
        entryDate: s.entryDate as Date, // Asumimos que si no es undefined, es Date
        exitDate: s.exitDate, // Puede ser Date o undefined
        notes: s.notes
      })).filter(s => s.entryDate) || [] // Filtramos por si entryDate fuera undefined teóricamente
    );
    setShowHorseForm(true);
  }, [isMounted, normalizeHorseDatesForState]);

  const handleDeleteHorse = useCallback(async (horseId: string) => {
    if (!isMounted) return; // Guard temprano
    setIsSubmitting(true);
    try {
      await deleteDoc(doc(db, 'horses', horseId));
      if (isMounted) {
        setHorses(prev => prev.filter(h => h.id !== horseId));
        if (selectedHorseForCalendar?.id === horseId) {
          setSelectedHorseForCalendar(null);
        }
        if (toast) toast({ title: t('success'), description: tHorses('horseDeleted'), variant: 'default' });
      }
    } catch (err: any) {
      console.error('Error deleting horse:', err);
      if (isMounted && toast) {
        toast({ title: t('error'), description: tHorses('errorDeleting'), variant: 'destructive' });
      }
    } finally {
      if (isMounted) {
        setIsSubmitting(false);
      }
    }
  }, [isMounted, db, selectedHorseForCalendar, toast, t, tHorses]);

  const handleSelectHorseForCalendar = useCallback((horse: Horse | null) => {
    if (!isMounted) return;
    
    if (selectedHorseForCalendar && selectedHorseForCalendar.id === horse?.id) {
      setSelectedHorseForCalendar(null);
      setHorseAssignmentsForCalendar([]);
      setSelectedDateForDetails(null);
    } else {
      const normalizedHorse = horse ? normalizeHorseDatesForState(horse) : null;
      setSelectedHorseForCalendar(normalizedHorse);
      setSelectedDateForDetails(null); 
      if (normalizedHorse) {
        setActivityCalendarMonth(
          normalizedHorse.entryDate && normalizedHorse.entryDate instanceof Date
            ? new Date(normalizedHorse.entryDate)
            : new Date()
        );
      } else {
        setActivityCalendarMonth(new Date());
      }
    }
  }, [isMounted, selectedHorseForCalendar, normalizeHorseDatesForState]);

  // Protección temprana contra renderizado durante desmontaje
  if (!isMounted) {
    return null;
  }

  if (authLoading || !activeStableId) { 
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!activeStableId && !authLoading) {
    return (
      <Alert variant="default" className="max-w-lg mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{tHorses('noActiveStable')}</AlertTitle>
          <AlertDescription>
          {tHorses('pleaseJoin')} <Link href="/profile" className="text-primary underline">{tHorses('createOrSelectStable')}</Link> {tHorses('toManageHorses')}
          </AlertDescription>
      </Alert>
    );
  }
  
  if (error && !isLoading) {
     return <Alert variant="destructive" className="max-w-lg mx-auto"><AlertCircle className="h-4 w-4" /><AlertTitle>{t('error')}</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>;
  }


  return (
    <StableWrapper className="container mx-auto py-8 space-y-8">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2"><PlusCircle className="h-6 w-6" />{editingHorse ? tHorses('editHorseDetails') : tHorses('addNewHorse')}</CardTitle>
            {!editingHorse && (<Button variant="ghost" size="icon" onClick={() => setShowHorseForm(!showHorseForm)} aria-expanded={showHorseForm} disabled={isSubmitting}>{showHorseForm ? <ChevronUp /> : <ChevronDown />}<span className="sr-only">{showHorseForm ? tHorses('hideForm') : tHorses('showForm')}</span></Button>)}
          </div>
          <CardDescription>{editingHorse ? tHorses('modifyDetails') : showHorseForm ? tHorses('completeDataToAdd') : tHorses('clickToShowForm')}</CardDescription>
        </CardHeader>
        {(editingHorse !== null || showHorseForm) && (
          <form onSubmit={handleSubmitHorse}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label htmlFor="horseNameJefe">{tHorses('horseName')}</Label><Input id="horseNameJefe" value={horseName} onChange={(e) => setHorseName(e.target.value)} required disabled={isSubmitting} /></div>
                <div><Label htmlFor="horseBreedJefe">{tHorses('breed')} ({t('optional')})</Label><Input id="horseBreedJefe" value={horseBreed} onChange={(e) => setHorseBreed(e.target.value)} disabled={isSubmitting} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label htmlFor="horseAgeJefe">{tHorses('age')} ({t('optional')})</Label><Input id="horseAgeJefe" type="number" value={horseAge} onChange={(e) => setHorseAge(e.target.value)} disabled={isSubmitting} /></div>
                <div><Label htmlFor="horseOwnerNameJefe">{tHorses('ownerName')} ({t('optional')})</Label><Input id="horseOwnerNameJefe" value={horseOwnerName} onChange={(e) => setHorseOwnerName(e.target.value)} disabled={isSubmitting} /></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label htmlFor="horseEntryDateJefe">{tHorses('entryDate')} ({t('optional')})</Label><Popover><PopoverTrigger asChild><Button id="horseEntryDateJefe" variant="outline" className={`w-full justify-start text-left font-normal ${!horseEntryDate && "text-muted-foreground"}`} disabled={isSubmitting}><CalendarIcon className="mr-2 h-4 w-4" />{horseEntryDate ? format(startOfDay(horseEntryDate), "PPP", { locale: es }) : tHorses('selectDate')}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={horseEntryDate} onSelect={(date) => setHorseEntryDate(date ? startOfDay(date) : undefined)} initialFocus disabled={isSubmitting}/></PopoverContent></Popover></div>
                <div><Label htmlFor="horseExitDateJefe">{tHorses('exitDate')} ({t('optional')})</Label><Popover><PopoverTrigger asChild><Button id="horseExitDateJefe" variant="outline" className={`w-full justify-start text-left font-normal ${!horseExitDate && "text-muted-foreground"}`} disabled={isSubmitting}><CalendarIcon className="mr-2 h-4 w-4" />{horseExitDate ? format(startOfDay(horseExitDate), "PPP", { locale: es }) : t('undefined')}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={horseExitDate} onSelect={(date) => setHorseExitDate(date ? startOfDay(date) : undefined)} initialFocus disabled={isSubmitting}/></PopoverContent></Popover></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label htmlFor="horseFarrierDueDateJefe">{tHorses('farrierDate')} ({t('optional')})</Label><Popover><PopoverTrigger asChild><Button id="horseFarrierDueDateJefe" variant="outline" className={`w-full justify-start text-left font-normal ${!horseFarrierDueDate && "text-muted-foreground"}`} disabled={isSubmitting}><CalendarIcon className="mr-2 h-4 w-4" />{horseFarrierDueDate ? format(startOfDay(horseFarrierDueDate), "PPP", { locale: es }) : tHorses('selectDate')}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={horseFarrierDueDate} onSelect={(date) => setHorseFarrierDueDate(date ? startOfDay(date) : undefined)} initialFocus disabled={isSubmitting}/></PopoverContent></Popover></div>
                <div><Label htmlFor="horseImageUrlJefe">{tHorses('imageUrl')} ({t('optional')})</Label><Input id="horseImageUrlJefe" value={horseImageUrl} onChange={(e) => setHorseImageUrl(e.target.value)} placeholder="https://placehold.co/600x400.png" disabled={isSubmitting} /></div>
              </div>
              <div><Label htmlFor="horseEquipmentLocationJefe">{tHorses('equipmentLocation')} ({t('optional')})</Label><Input id="horseEquipmentLocationJefe" value={horseEquipmentLocation} onChange={(e) => setHorseEquipmentLocation(e.target.value)} disabled={isSubmitting} /></div>
              <div><Label htmlFor="horseNotesJefe">{tHorses('notes')} ({t('optional')})</Label><Textarea id="horseNotesJefe" value={horseNotes} onChange={(e) => setHorseNotes(e.target.value)} disabled={isSubmitting} /></div>
              <div><Label htmlFor="horseAdditionalCareNotesJefe">{tHorses('additionalCareNotes')} ({t('optional')})</Label><Textarea id="horseAdditionalCareNotesJefe" value={horseAdditionalCareNotes} onChange={(e) => setHorseAdditionalCareNotes(e.target.value)} disabled={isSubmitting} /></div>

              {editingHorse && (
                <div className="mt-6 pt-4 border-t">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><History className="h-5 w-5"/>Historial de Estancias</h3>
                  {horseHistoricalStays.length > 0 ? (
                    <ul className="space-y-2 mb-4">
                      {horseHistoricalStays.map((stay, index) => (
                        <li key={index} className="p-3 border rounded-md text-sm bg-muted/30">
                          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start">
                            <div className="flex-grow">
                              <p><strong>Ingreso:</strong> {stay.entryDate ? format(startOfDay(stay.entryDate), "PPP", { locale: es }) : "N/D"} - <strong>Salida:</strong> {stay.exitDate ? format(startOfDay(stay.exitDate), "PPP", { locale: es }) : "Presente"}</p>
                              {stay.notes && <p className="text-xs mt-1 text-muted-foreground">Notas: {stay.notes}</p>}
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="text-destructive hover:text-destructive self-start sm:self-center shrink-0" onClick={() => handleRemoveHistoricalStay(index)} disabled={isSubmitting} title="Eliminar esta estancia del formulario">
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-3">No hay estancias históricas previas registradas para este caballo en el formulario.</p>
                  )}

                  <div className="mt-2 p-4 border rounded-md space-y-3 bg-card shadow">
                    <h4 className="text-md font-semibold">Añadir Estancia al Historial del Formulario</h4>
                     <p className="text-xs text-muted-foreground">
                      Para añadir una nueva estancia histórica, completa al menos la "Fecha de Ingreso (Hist.)".
                      Si dejas "Fecha Ingreso (Hist.)" vacía y completas "Fecha Salida (Hist.)", se intentará actualizar la salida de la estancia principal actual (si no tiene).
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="newHistoricalEntryDateJefe">Fecha de Ingreso (Hist.)</Label>
                        <Popover><PopoverTrigger asChild><Button id="newHistoricalEntryDateJefe" variant="outline" className={`w-full justify-start text-left font-normal ${!newHistoricalEntryDate && "text-muted-foreground"}`} disabled={isSubmitting}><CalendarIcon className="mr-2 h-4 w-4" />{newHistoricalEntryDate ? format(startOfDay(newHistoricalEntryDate), "PPP", { locale: es }) : "Selecciona"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={newHistoricalEntryDate} onSelect={(date) => setNewHistoricalEntryDate(date ? startOfDay(date) : undefined)} initialFocus disabled={isSubmitting}/></PopoverContent></Popover>
                      </div>
                      <div>
                        <Label htmlFor="newHistoricalExitDateJefe">Fecha de Salida (Hist., Opcional)</Label>
                        <Popover><PopoverTrigger asChild><Button id="newHistoricalExitDateJefe" variant="outline" className={`w-full justify-start text-left font-normal ${!newHistoricalExitDate && "text-muted-foreground"}`} disabled={isSubmitting}><CalendarIcon className="mr-2 h-4 w-4" />{newHistoricalExitDate ? format(startOfDay(newHistoricalExitDate), "PPP", { locale: es }) : "Indefinido (Opcional)"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={newHistoricalExitDate} onSelect={(date) => setNewHistoricalExitDate(date ? startOfDay(date) : undefined)} initialFocus disabled={isSubmitting}/></PopoverContent></Popover>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="newHistoricalNotesJefe">Notas de Estancia (Hist., Opcional)</Label>
                      <Textarea id="newHistoricalNotesJefe" value={newHistoricalNotes} onChange={(e) => setNewHistoricalNotes(e.target.value)} placeholder="Notas sobre esta estancia..." disabled={isSubmitting} rows={2} />
                    </div>
                    <Button type="button" onClick={handleAddHistoricalStay} variant="outline" size="sm" disabled={!(newHistoricalEntryDate || newHistoricalExitDate) || isSubmitting}>
                      Añadir al Historial del Formulario
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              {editingHorse && <Button type="button" variant="outline" onClick={resetForm} disabled={isSubmitting}>{tHorses('cancelEdit')}</Button>}
              <Button type="submit" disabled={isSubmitting}>
                <Loader2 className={`mr-2 h-4 w-4 animate-spin ${isSubmitting ? 'opacity-100' : 'opacity-0 w-0 mr-0'}`} />
                {editingHorse ? tHorses('saveChanges') : tHorses('addHorse')}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><PawPrint className="h-6 w-6" />Caballos en la Cuadra</CardTitle>
          <CardDescription>Lista de caballos. Haz clic para ver su calendario y detalles.</CardDescription>
        </CardHeader>
        <CardContent>
        { isLoading ? (<div className="flex justify-center items-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>) :
          horses.length === 0 ? (<p className="text-muted-foreground p-4 text-center">No hay caballos registrados.</p>) : (
            <Table>
              <TableHeader><TableRow><TableHead>Imagen</TableHead><TableHead>Nombre</TableHead><TableHead>Raza</TableHead><TableHead>Edad</TableHead><TableHead>Dueño</TableHead><TableHead>F. Ingreso Ppal.</TableHead><TableHead className="max-w-xs">Notas Generales</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
              <TableBody>
                {horses.sort((a, b) => a.name.localeCompare(b.name)).map((horse) => (
                  <TableRow key={horse.id} onClick={() => handleSelectHorseForCalendar(horse)} className={`cursor-pointer hover:bg-muted/50 ${selectedHorseForCalendar?.id === horse.id ? "bg-primary/10 dark:bg-primary/20 ring-2 ring-primary" : ""}`} aria-selected={selectedHorseForCalendar?.id === horse.id}>
                    <TableCell><Avatar className="h-10 w-10 rounded-md"><AvatarImage src={horse.imageUrl || `https://placehold.co/60x60.png?text=${horse.name[0]}`} alt={horse.name} data-ai-hint={horse.dataAiHint || "horse animal"} className="object-cover" /><AvatarFallback className="rounded-md">{horse.name[0].toUpperCase()}</AvatarFallback></Avatar></TableCell>
                    <TableCell className="font-medium">{horse.name}</TableCell>
                    <TableCell>{horse.breed || "N/D"}</TableCell>
                    <TableCell>{horse.age ? `${horse.age} años` : "N/D"}</TableCell>
                    <TableCell>{horse.ownerName || "N/D"}</TableCell>
                    <TableCell>{horse.entryDate && horse.entryDate instanceof Date ? format(startOfDay(horse.entryDate), "dd/MM/yy", { locale: es }) : "N/D"}</TableCell>
                    <TableCell className="max-w-xs truncate" title={horse.notes || undefined}>{horse.notes || "N/D"}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEditHorse(horse);}} disabled={isSubmitting} title="Editar Caballo"><Edit2 className="h-4 w-4" /></Button>
                      <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={(e) => e.stopPropagation()} disabled={isSubmitting} title="Eliminar Caballo"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Seguro que quieres eliminar a {horse.name}?</AlertDialogTitle><AlertDialogDescription>Esta acción es irreversible.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteHorse(horse.id)} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedHorseForCalendar && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2"><CalendarDays className="h-6 w-6"/>Actividad de: {selectedHorseForCalendar.name}</span>
              <Button variant="outline" size="sm" onClick={() => handleSelectHorseForCalendar(null)}><X className="h-4 w-4 mr-2" /> Cerrar Detalles</Button>
            </CardTitle>
            <CardDescription>Visualiza días de trabajo, ingreso/salida y otra info. Clic en un día para detalles.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              {isCalendarLoading ? <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div> : (
                <Calendar
                    mode="single" 
                    selected={selectedDateForDetails || undefined} 
                    onSelect={(date) => setSelectedDateForDetails(date ? startOfDay(date) : null)}
                    month={activityCalendarMonth}
                    onMonthChange={setActivityCalendarMonth}
                    locale={es} className="rounded-md border shadow mx-auto"
                    modifiers={{
                        worked: horseAssignmentsForCalendar.map(a => startOfDay(a.date instanceof Timestamp ? a.date.toDate() : new Date(a.date))),
                        entry: selectedHorseForCalendar.entryDate && selectedHorseForCalendar.entryDate instanceof Date ? [startOfDay(selectedHorseForCalendar.entryDate)] : [],
                        exit: selectedHorseForCalendar.exitDate && selectedHorseForCalendar.exitDate instanceof Date ? [startOfDay(selectedHorseForCalendar.exitDate)] : [],
                        historicalEntry: selectedHorseForCalendar.historicalStays
                            ?.filter(s => s.entryDate && s.entryDate instanceof Date)
                            .map(s => startOfDay(s.entryDate as Date))
                            .filter(d => d && !isNaN(d.getTime()))
                            || [],
                        historicalExit: selectedHorseForCalendar.historicalStays
                            ?.filter(s => s.exitDate && s.exitDate instanceof Date)
                            .map(s => startOfDay(s.exitDate as Date))
                            .filter(d => d && !isNaN(d.getTime()))
                            || [],
                    }}
                    modifiersClassNames={{
                        worked: 'bg-green-300 text-green-900 dark:bg-green-700/80 dark:text-green-100 font-semibold rounded-md',
                        entry: 'bg-purple-300 text-purple-900 dark:bg-purple-700/80 dark:text-purple-100 font-semibold rounded-md',
                        exit: 'bg-blue-300 text-blue-900 dark:bg-blue-700/80 dark:text-blue-100 font-semibold rounded-md',
                        historicalEntry: 'bg-purple-200/80 text-purple-800 dark:bg-purple-800/70 dark:text-purple-200 rounded-md border-2 border-purple-400',
                        historicalExit: 'bg-blue-200/80 text-blue-800 dark:bg-blue-800/70 dark:text-blue-200 rounded-md border-2 border-blue-400',
                        today: 'bg-accent text-accent-foreground ring-2 ring-accent rounded-md'
                    }}
                    onDayClick={(day, modifiers) => {
                        if (modifiers.worked || modifiers.entry || modifiers.exit || modifiers.historicalEntry || modifiers.historicalExit || isSameDay(day, new Date())) {
                           setSelectedDateForDetails(startOfDay(day));
                        } else {
                           setSelectedDateForDetails(null);
                        }
                    }}
                 />
              )}
            </div>
            <div className="space-y-4 md:col-span-1">
              <h4 className="font-semibold text-lg">Detalles del Día Seleccionado:</h4>
              {selectedDateForDetails ? (
                <div>
                  <p className="font-medium mb-2">{format(selectedDateForDetails, "PPP", { locale: es })}:</p>
                  {selectedHorseForCalendar.entryDate && selectedHorseForCalendar.entryDate instanceof Date && isSameDay(selectedDateForDetails, startOfDay(selectedHorseForCalendar.entryDate)) && <p className="text-sm text-purple-700 dark:text-purple-400">Fecha de Ingreso Principal.</p>}
                  {selectedHorseForCalendar.exitDate && selectedHorseForCalendar.exitDate instanceof Date && isSameDay(selectedDateForDetails, startOfDay(selectedHorseForCalendar.exitDate)) && <p className="text-sm text-blue-700 dark:text-blue-400">Fecha de Salida Principal.</p>}
                  {selectedHorseForCalendar.historicalStays?.map((stay, idx) => (
                    <React.Fragment key={`hist_stay_detail_jefe_caballos_${idx}`}>
                      {stay.entryDate && stay.entryDate instanceof Date && isSameDay(selectedDateForDetails, startOfDay(stay.entryDate)) && <p className="text-xs text-purple-600 dark:text-purple-500">Ingreso Histórico{stay.notes ? ` (${stay.notes})` : ''}.</p>}
                      {stay.exitDate && stay.exitDate instanceof Date && isSameDay(selectedDateForDetails, startOfDay(stay.exitDate)) && <p className="text-xs text-blue-600 dark:text-blue-500">Salida Histórica{stay.notes ? ` (${stay.notes})` : ''}.</p>}
                    </React.Fragment>
                  ))}
                  {horseAssignmentsForCalendar.filter(a => isSameDay(startOfDay(a.date instanceof Timestamp ? a.date.toDate() : new Date(a.date)), selectedDateForDetails)).map(assignment => (
                      <div key={assignment.id} className="mb-2 p-2 border rounded-md bg-green-100 dark:bg-green-900/30">
                        <p className="text-sm font-semibold">
                            Monta ({getJineteNameForAssignment(assignment.jineteId)}) {format(assignment.date instanceof Timestamp ? assignment.date.toDate() : new Date(assignment.date), "HH:mm", { locale: es })}
                        </p>
                        {assignment.notes && <p className="text-xs text-muted-foreground">Notas de la monta: {assignment.notes}</p>}
                      </div>
                  ))}
                  {!horseAssignmentsForCalendar.some(a => isSameDay(startOfDay(a.date instanceof Timestamp ? a.date.toDate() : new Date(a.date)), selectedDateForDetails)) &&
                   !(selectedHorseForCalendar.entryDate && selectedHorseForCalendar.entryDate instanceof Date && isSameDay(selectedDateForDetails, startOfDay(selectedHorseForCalendar.entryDate))) &&
                   !(selectedHorseForCalendar.exitDate && selectedHorseForCalendar.exitDate instanceof Date && isSameDay(selectedDateForDetails, startOfDay(selectedHorseForCalendar.exitDate))) &&
                   !selectedHorseForCalendar.historicalStays?.some(s =>
                        (s.entryDate && s.entryDate instanceof Date && isSameDay(selectedDateForDetails, startOfDay(s.entryDate))) ||
                        (s.exitDate && s.exitDate instanceof Date && isSameDay(selectedDateForDetails, startOfDay(s.exitDate)))
                    ) &&
                   (<p className="text-sm text-muted-foreground">No hay montas o eventos especiales para este día.</p>)
                  }
                </div>
              ) : (<p className="text-sm text-muted-foreground">Selecciona un día en el calendario para ver detalles.</p>)}

              <hr className="my-4"/>
              <h4 className="font-semibold text-lg mt-4">Información Adicional del Caballo:</h4>
              {selectedHorseForCalendar.farrierDueDate && selectedHorseForCalendar.farrierDueDate instanceof Date && <p className="text-sm"><strong>Próximo Herrador:</strong> {format(startOfDay(selectedHorseForCalendar.farrierDueDate), "PPP", { locale: es })}</p>}
              {selectedHorseForCalendar.equipmentLocation && <p className="text-sm"><strong>Ubicación del Material:</strong> {selectedHorseForCalendar.equipmentLocation}</p>}
              {selectedHorseForCalendar.additionalCareNotes && <div><p className="text-sm"><strong>Notas Adicionales de Cuidado:</strong></p><p className="text-xs whitespace-pre-wrap bg-muted/50 p-2 rounded-md">{selectedHorseForCalendar.additionalCareNotes}</p></div>}

              {selectedHorseForCalendar.historicalStays && selectedHorseForCalendar.historicalStays.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-semibold">Historial Completo de Estancias:</p>
                  <ul className="list-disc list-inside text-xs space-y-1 pl-1">
                    {selectedHorseForCalendar.historicalStays.sort((a,b) => {
                        const dateA = a.entryDate && a.entryDate instanceof Date ? startOfDay(a.entryDate).getTime() : 0;
                        const dateB = b.entryDate && b.entryDate instanceof Date ? startOfDay(b.entryDate).getTime() : 0;
                        return dateB - dateA; 
                    }).map((stay, idx) => (
                      <li key={`hist_detail_list_jefe_caballos_${idx}`}>
                        {stay.entryDate && stay.entryDate instanceof Date ? format(startOfDay(stay.entryDate), "dd/MM/yy") : "N/D"} - {stay.exitDate && stay.exitDate instanceof Date ? format(startOfDay(stay.exitDate), "dd/MM/yy") : "Actual"}
                        {stay.notes && <span className="text-muted-foreground"> ({stay.notes})</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
               {!selectedHorseForCalendar.farrierDueDate && !selectedHorseForCalendar.equipmentLocation && !selectedHorseForCalendar.additionalCareNotes && (!selectedHorseForCalendar.historicalStays || selectedHorseForCalendar.historicalStays.length === 0) && <p className="text-sm text-muted-foreground">No hay información adicional registrada.</p>}
            </div>
          </CardContent>
        </Card>
      )}
    </StableWrapper>
  );
}
