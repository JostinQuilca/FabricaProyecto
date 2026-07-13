import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map, throwError, catchError } from 'rxjs';
import { switchMap, of } from 'rxjs';
import { AuthPayload, Usuario, Role } from '../models/user.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  
  // Reactive state for the current user
  currentUser = signal<Usuario | null>(null);

  constructor(private http: HttpClient) {
    this.loadUserFromToken();
  }

  private loadUserFromToken() {
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');
    if (token && userJson) {
      try {
        this.currentUser.set(JSON.parse(userJson));
      } catch (e) {
        this.logout();
      }
    }
  }

  login(email: string, password: string): Observable<AuthPayload> {
    const query = `
      mutation Login($email: String!, $password: String!) {
        login(email: $email, password: $password) {
          token
          usuario {
            id
            nombre
            email
            rol {
              nombre
            }
            createdAt
          }
        }
      }
    `;

    return this.http.post<any>(this.apiUrl, {
      query,
      variables: { email, password }
    }).pipe(
      switchMap(res => {
        if (res.errors && res.errors.length > 0) {
          return throwError(() => new Error(res.errors[0].message));
        }
        if (!res.data || !res.data.login) {
          return throwError(() => new Error('Error al iniciar sesión'));
        }
        
        const payload = res.data.login;
        payload.usuario.rol = payload.usuario.rol.nombre as Role;
        
        return of(payload as AuthPayload);
      }),
      tap(payload => this.handleAuthSuccess(payload)),
      catchError(err => {
        return throwError(() => err);
      })
    );
  }

  registro(nombre: string, email: string, password: string, rol: Role): Observable<AuthPayload> {
    const rolId = rol === Role.ADMIN ? '1' : rol === Role.DOCENTE ? '2' : '3';
    
    const query = `
      mutation Registro($nombre: String!, $email: String!, $password: String!, $rolId: ID!) {
        registro(nombre: $nombre, email: $email, password: $password, rolId: $rolId) {
          token
          usuario {
            id
            nombre
            email
            rol {
              nombre
            }
            createdAt
          }
        }
      }
    `;

    return this.http.post<any>(this.apiUrl, {
      query,
      variables: { nombre, email, password, rolId }
    }).pipe(
      switchMap(res => {
        if (res.errors && res.errors.length > 0) {
          return throwError(() => new Error(res.errors[0].message));
        }
        if (!res.data || !res.data.registro) {
          return throwError(() => new Error('Error en el registro'));
        }
        
        const payload = res.data.registro;
        payload.usuario.rol = payload.usuario.rol.nombre as Role;
        
        return of(payload as AuthPayload);
      }),
      tap(payload => this.handleAuthSuccess(payload)),
      catchError(err => {
        return throwError(() => err);
      })
    );
  }

  private handleAuthSuccess(payload: AuthPayload) {
    localStorage.setItem('token', payload.token);
    localStorage.setItem('user', JSON.stringify(payload.usuario));
    this.currentUser.set(payload.usuario);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUser.set(null);
  }

  isAuthenticated(): boolean {
    return this.currentUser() !== null;
  }

  getUserRole(): Role | null {
    const user = this.currentUser();
    return user ? user.rol : null;
  }
}
