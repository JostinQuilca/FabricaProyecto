import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { GraphqlService } from './graphql.service';
import { Calificacion } from '../models/calificacion.model';
import { Usuario } from '../models/user.model';

// CA-019 · Servicio de Calificaciones
@Injectable({ providedIn: 'root' })
export class CalificacionService {
  private gql = inject(GraphqlService);

  private readonly FIELDS = `
    id nota periodo observacion createdAt
    estudiante { id nombre email }
    materia { id codigo nombre }
  `;

  listar(): Observable<Calificacion[]> {
    const query = `query { calificaciones { ${this.FIELDS} } }`;
    return this.gql.request<{ calificaciones: Calificacion[] }>(query).pipe(map(d => d.calificaciones));
  }

  registrar(estudianteId: string, materiaId: string, nota: number, periodo: string, observacion?: string): Observable<Calificacion> {
    const query = `
      mutation Registrar($estudianteId: ID!, $materiaId: ID!, $nota: Float!, $periodo: String!, $observacion: String) {
        registrarCalificacion(estudianteId: $estudianteId, materiaId: $materiaId, nota: $nota, periodo: $periodo, observacion: $observacion) {
          ${this.FIELDS}
        }
      }`;
    return this.gql
      .request<{ registrarCalificacion: Calificacion }>(query, { estudianteId, materiaId, nota, periodo, observacion })
      .pipe(map(d => d.registrarCalificacion));
  }

  eliminar(id: string): Observable<boolean> {
    const query = `mutation Eliminar($id: ID!) { eliminarCalificacion(id: $id) }`;
    return this.gql.request<{ eliminarCalificacion: boolean }>(query, { id }).pipe(map(d => d.eliminarCalificacion));
  }

  // Listas auxiliares para los selectores del formulario
  estudiantes(): Observable<Usuario[]> {
    const query = `query { usuarios { id nombre email rol { nombre } } }`;
    return this.gql.request<{ usuarios: any[] }>(query).pipe(
      map(d => d.usuarios.filter(u => u.rol?.nombre === 'ESTUDIANTE')
        .map(u => ({ id: u.id, nombre: u.nombre, email: u.email, rol: u.rol.nombre })))
    );
  }
  materias(): Observable<{ id: string; codigo: string; nombre: string }[]> {
    const query = `query { materias { id codigo nombre } }`;
    return this.gql.request<{ materias: any[] }>(query).pipe(map(d => d.materias));
  }
}
