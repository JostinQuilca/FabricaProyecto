// CA-017 · Modelo de Inscripción (Sprint 2 · HU-S2.4)
import { Materia } from './materia.model';

export interface EstudianteRef {
  id: string;
  nombre: string;
  email: string;
}

export interface Inscripcion {
  id: string;
  estudiante: EstudianteRef;
  materia: Materia;
  estado: string;
  fechaInscripcion: string;
}
