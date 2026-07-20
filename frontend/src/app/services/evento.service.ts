import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { GraphqlService } from './graphql.service';

// CA-022 · Servicio del Calendario Académico
export interface Evento {
  id: string;
  titulo: string;
  descripcion?: string;
  fechaInicio: string;
  fechaFin?: string;
  tipo: string;
  color?: string;
}

export const TIPOS_EVENTO = ['CLASE', 'EXAMEN', 'TALLER', 'ENTREGA', 'FERIADO', 'OTRO'];

@Injectable({ providedIn: 'root' })
export class EventoService {
  private gql = inject(GraphqlService);

  private readonly FIELDS = `id titulo descripcion fechaInicio fechaFin tipo color`;

  listar(): Observable<Evento[]> {
    const query = `query { eventos { ${this.FIELDS} } }`;
    return this.gql.request<{ eventos: Evento[] }>(query).pipe(map(d => d.eventos));
  }

  crear(e: { titulo: string; descripcion?: string; fechaInicio: string; fechaFin?: string; tipo: string; color?: string }): Observable<Evento> {
    const query = `
      mutation CrearEvento($titulo: String!, $descripcion: String, $fechaInicio: String!, $fechaFin: String, $tipo: String!, $color: String) {
        crearEvento(titulo: $titulo, descripcion: $descripcion, fechaInicio: $fechaInicio, fechaFin: $fechaFin, tipo: $tipo, color: $color) { ${this.FIELDS} }
      }`;
    return this.gql.request<{ crearEvento: Evento }>(query, e).pipe(map(d => d.crearEvento));
  }

  eliminar(id: string): Observable<boolean> {
    const query = `mutation EliminarEvento($id: ID!) { eliminarEvento(id: $id) }`;
    return this.gql.request<{ eliminarEvento: boolean }>(query, { id }).pipe(map(d => d.eliminarEvento));
  }
}
