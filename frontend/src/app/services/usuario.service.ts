import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { GraphqlService } from './graphql.service';

// CA-020 · Servicio de Gestión de Usuarios
export interface UsuarioGestion {
  id: string;
  nombre: string;
  email: string;
  rol: { id: string; nombre: string };
}

export interface RolRef {
  id: string;
  nombre: string;
}

@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private gql = inject(GraphqlService);

  private readonly FIELDS = `id nombre email rol { id nombre }`;

  listar(): Observable<UsuarioGestion[]> {
    const query = `query { usuarios { ${this.FIELDS} } }`;
    return this.gql.request<{ usuarios: UsuarioGestion[] }>(query).pipe(map(d => d.usuarios));
  }

  roles(): Observable<RolRef[]> {
    const query = `query { roles { id nombre } }`;
    return this.gql.request<{ roles: RolRef[] }>(query).pipe(map(d => d.roles));
  }

  crear(nombre: string, email: string, password: string, rolId: string): Observable<UsuarioGestion> {
    const query = `
      mutation CrearUsuario($nombre: String!, $email: String!, $password: String!, $rolId: ID!) {
        crearUsuario(nombre: $nombre, email: $email, password: $password, rolId: $rolId) { ${this.FIELDS} }
      }`;
    return this.gql
      .request<{ crearUsuario: UsuarioGestion }>(query, { nombre, email, password, rolId })
      .pipe(map(d => d.crearUsuario));
  }

  actualizar(id: string, cambios: { nombre?: string; email?: string; rolId?: string; password?: string }): Observable<UsuarioGestion> {
    const query = `
      mutation ActualizarUsuario($id: ID!, $nombre: String, $email: String, $rolId: ID, $password: String) {
        actualizarUsuario(id: $id, nombre: $nombre, email: $email, rolId: $rolId, password: $password) { ${this.FIELDS} }
      }`;
    return this.gql
      .request<{ actualizarUsuario: UsuarioGestion }>(query, { id, ...cambios })
      .pipe(map(d => d.actualizarUsuario));
  }

  eliminar(id: string): Observable<boolean> {
    const query = `mutation EliminarUsuario($id: ID!) { eliminarUsuario(id: $id) }`;
    return this.gql.request<{ eliminarUsuario: boolean }>(query, { id }).pipe(map(d => d.eliminarUsuario));
  }
}
