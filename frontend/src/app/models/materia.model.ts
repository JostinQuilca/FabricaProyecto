// CA-016 · Modelo de Materia (Sprint 2 · HU-S2.2)
export interface Materia {
  id: string;
  codigo: string;
  nombre: string;
  creditos: number;
  descripcion?: string;
  docente?: { id: string; nombre: string } | null;
  createdAt?: string;
}

export interface MateriaInput {
  codigo: string;
  nombre: string;
  creditos: number;
  descripcion?: string;
  docenteId?: string | null;
}
