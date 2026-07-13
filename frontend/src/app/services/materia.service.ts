import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { GraphqlService } from './graphql.service';
import { Materia, MateriaInput } from '../models/materia.model';

// CA-016 · Servicio de Materias (Sprint 2 · HU-S2.2)
@Injectable({ providedIn: 'root' })
export class MateriaService {
  private gql = inject(GraphqlService);

  private readonly MATERIA_FIELDS = `
    id codigo nombre creditos descripcion
    docente { id nombre }
  `;

  listar(): Observable<Materia[]> {
    const query = `query { materias { ${this.MATERIA_FIELDS} } }`;
    return this.gql.request<{ materias: Materia[] }>(query).pipe(map(d => d.materias));
  }

  crear(input: MateriaInput): Observable<Materia> {
    const query = `
      mutation CrearMateria($codigo: String!, $nombre: String!, $creditos: Int!, $descripcion: String, $docenteId: ID) {
        crearMateria(codigo: $codigo, nombre: $nombre, creditos: $creditos, descripcion: $descripcion, docenteId: $docenteId) {
          ${this.MATERIA_FIELDS}
        }
      }`;
    return this.gql.request<{ crearMateria: Materia }>(query, input).pipe(map(d => d.crearMateria));
  }

  actualizar(id: string, input: MateriaInput): Observable<Materia> {
    const query = `
      mutation ActualizarMateria($id: ID!, $codigo: String, $nombre: String, $creditos: Int, $descripcion: String, $docenteId: ID) {
        actualizarMateria(id: $id, codigo: $codigo, nombre: $nombre, creditos: $creditos, descripcion: $descripcion, docenteId: $docenteId) {
          ${this.MATERIA_FIELDS}
        }
      }`;
    return this.gql.request<{ actualizarMateria: Materia }>(query, { id, ...input }).pipe(map(d => d.actualizarMateria));
  }

  eliminar(id: string): Observable<boolean> {
    const query = `mutation EliminarMateria($id: ID!) { eliminarMateria(id: $id) }`;
    return this.gql.request<{ eliminarMateria: boolean }>(query, { id }).pipe(map(d => d.eliminarMateria));
  }
}
