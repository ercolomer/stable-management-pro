import type { Timestamp } from "firebase/firestore";

export type UserRole = "jinete" | "jefe de cuadra" | "mozo de cuadra";

// Interfaz UserProfile revertida a cuadra única
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole | null;
  photoURL?: string | null;
  dataAiHint?: string;
  stableId: string | null; // ID de la cuadra única a la que pertenece
  stableName?: string | null; // Nombre denormalizado de la cuadra
  requestedStableId?: string | null; // ID de la cuadra a la que ha solicitado unirse
  createdAt?: Timestamp; // Fecha de creación del perfil
  lastLoginAt?: Timestamp; // Última fecha de inicio de sesión
  // Se elimina 'memberships'
}

// Interfaz PendingMember para solicitudes (revertida)
export interface PendingMember {
  userId: string;
  displayName: string | null;
  email: string | null;
  requestedAt: Timestamp;
  requestedRole?: UserRole; // El rol que solicita el jinete
}

// Interfaz Stable revertida a cuadra única (ownerId singular)
export interface Stable {
  id: string;
  name: string;
  ownerId: string; // UID del jefe de cuadra principal
  members: string[]; // UIDs de los miembros (incluyendo el ownerId)
  pendingMembers?: PendingMember[]; // Solicitudes pendientes para unirse
  createdAt: Timestamp;
}

export type AssignmentScope = 'SPECIFIC_USER' | 'ANYONE_IN_STABLE' | 'ALL_MEMBERS_INDIVIDUALLY';

export interface DailyTask {
  id: string;
  stableId: string;
  description: string;
  assignmentScope: AssignmentScope;
  assignedTo?: string | null; // UID del jinete asignado, si scope es SPECIFIC_USER
  isCompleted: boolean;
  completedBy?: string | null;
  completedAt?: Date | Timestamp | null;
  createdAt: Date | Timestamp;
  dueDate?: Date | Timestamp | null;
  updatedAt?: Date | Timestamp;
}

export interface HorseAssignment {
  id: string;
  stableId: string;
  jineteId: string;
  horseName: string;
  date: Date | Timestamp;
  notes?: string;
  isCompleted?: boolean;
  completedBy?: string | null;
  completedAt?: Date | Timestamp | null;
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}

export interface HistoricalStay {
  entryDate: Date | Timestamp;
  exitDate?: Date | Timestamp | null;
  notes?: string;
}

export type HistoricalStayForm = {
  entryDate: Date;
  exitDate?: Date;
  notes?: string;
};

export interface Horse {
  id: string;
  stableId: string;
  name: string;
  breed?: string;
  age?: number;
  notes?: string;
  imageUrl?: string;
  dataAiHint?: string;
  ownerName?: string;
  entryDate?: Date | Timestamp | null;
  exitDate?: Date | Timestamp | null;
  farrierDueDate?: Date | Timestamp | null;
  equipmentLocation?: string;
  additionalCareNotes?: string;
  historicalStays?: Array<{
    entryDate: Date | Timestamp;
    exitDate?: Date | Timestamp | null;
    notes?: string;
  }>;
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}
