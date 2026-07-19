// CA-019 · Modelo de Calificación
import { Materia } from './materia.model';

export interface Calificacion {
  id: string;
  estudiante: { id: string; nombre: string; email: string };
  materia: Materia;
  nota: number;
  periodo: string;
  observacion?: string;
  createdAt: string;
}
