import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { GraphqlService } from './graphql.service';
import { Inscripcion } from '../models/inscripcion.model';
import { Usuario } from '../models/user.model';

// CA-017 · Servicio de Inscripciones (Sprint 2 · HU-S2.4)
@Injectable({ providedIn: 'root' })
export class InscripcionService {
  private gql = inject(GraphqlService);

  private readonly INSCRIPCION_FIELDS = `
    id estado fechaInscripcion
    estudiante { id nombre email }
    materia { id codigo nombre creditos }
  `;

  listar(): Observable<Inscripcion[]> {
    const query = `query { inscripciones { ${this.INSCRIPCION_FIELDS} } }`;
    return this.gql.request<{ inscripciones: Inscripcion[] }>(query).pipe(map(d => d.inscripciones));
  }

  porEstudiante(estudianteId: string): Observable<Inscripcion[]> {
    const query = `
      query PorEstudiante($estudianteId: ID!) {
        inscripcionesByEstudiante(estudianteId: $estudianteId) { ${this.INSCRIPCION_FIELDS} }
      }`;
    return this.gql
      .request<{ inscripcionesByEstudiante: Inscripcion[] }>(query, { estudianteId })
      .pipe(map(d => d.inscripcionesByEstudiante));
  }

  inscribir(estudianteId: string, materiaId: string): Observable<Inscripcion> {
    const query = `
      mutation Inscribir($estudianteId: ID!, $materiaId: ID!) {
        inscribir(estudianteId: $estudianteId, materiaId: $materiaId) { ${this.INSCRIPCION_FIELDS} }
      }`;
    return this.gql
      .request<{ inscribir: Inscripcion }>(query, { estudianteId, materiaId })
      .pipe(map(d => d.inscribir));
  }

  desinscribir(estudianteId: string, materiaId: string): Observable<boolean> {
    const query = `
      mutation Desinscribir($estudianteId: ID!, $materiaId: ID!) {
        desinscribir(estudianteId: $estudianteId, materiaId: $materiaId)
      }`;
    return this.gql
      .request<{ desinscribir: boolean }>(query, { estudianteId, materiaId })
      .pipe(map(d => d.desinscribir));
  }

  // Listado de estudiantes (rol ESTUDIANTE) para el selector de inscripción
  estudiantes(): Observable<Usuario[]> {
    const query = `query { usuarios { id nombre email rol { nombre } } }`;
    return this.gql.request<{ usuarios: any[] }>(query).pipe(
      map(d =>
        d.usuarios
          .filter(u => u.rol?.nombre === 'ESTUDIANTE')
          .map(u => ({ id: u.id, nombre: u.nombre, email: u.email, rol: u.rol.nombre }))
      )
    );
  }
}
