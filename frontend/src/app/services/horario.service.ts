import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { GraphqlService } from './graphql.service';

// CA-023 · Servicio de Horarios
export interface Horario {
  id: string;
  materia: { id: string; codigo: string; nombre: string };
  dia: string;
  horaInicio: string;
  horaFin: string;
  aula?: string;
  docente?: { id: string; nombre: string } | null;
}

export const DIAS_SEMANA = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'];

@Injectable({ providedIn: 'root' })
export class HorarioService {
  private gql = inject(GraphqlService);

  private readonly FIELDS = `
    id dia horaInicio horaFin aula
    materia { id codigo nombre }
    docente { id nombre }
  `;

  listar(): Observable<Horario[]> {
    const query = `query { horarios { ${this.FIELDS} } }`;
    return this.gql.request<{ horarios: Horario[] }>(query).pipe(map(d => d.horarios));
  }

  crear(materiaId: string, dia: string, horaInicio: string, horaFin: string, aula?: string, docenteId?: string): Observable<Horario> {
    const query = `
      mutation CrearHorario($materiaId: ID!, $dia: String!, $horaInicio: String!, $horaFin: String!, $aula: String, $docenteId: ID) {
        crearHorario(materiaId: $materiaId, dia: $dia, horaInicio: $horaInicio, horaFin: $horaFin, aula: $aula, docenteId: $docenteId) { ${this.FIELDS} }
      }`;
    return this.gql
      .request<{ crearHorario: Horario }>(query, { materiaId, dia, horaInicio, horaFin, aula, docenteId })
      .pipe(map(d => d.crearHorario));
  }

  eliminar(id: string): Observable<boolean> {
    const query = `mutation EliminarHorario($id: ID!) { eliminarHorario(id: $id) }`;
    return this.gql.request<{ eliminarHorario: boolean }>(query, { id }).pipe(map(d => d.eliminarHorario));
  }

  materias(): Observable<{ id: string; codigo: string; nombre: string }[]> {
    const query = `query { materias { id codigo nombre } }`;
    return this.gql.request<{ materias: any[] }>(query).pipe(map(d => d.materias));
  }
}
