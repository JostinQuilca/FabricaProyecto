import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, throwError, catchError } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Servicio GraphQL base (CA-010 extendido · Sprint 2).
 * Centraliza las llamadas al endpoint GraphQL, adjunta el token JWT
 * y normaliza el manejo de errores para todos los módulos.
 */
@Injectable({ providedIn: 'root' })
export class GraphqlService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  request<T>(query: string, variables: object = {}): Observable<T> {
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders(
      token ? { Authorization: `Bearer ${token}` } : {}
    );

    return this.http.post<any>(this.apiUrl, { query, variables }, { headers }).pipe(
      map(res => {
        if (res.errors && res.errors.length > 0) {
          throw new Error(res.errors[0].message);
        }
        return res.data as T;
      }),
      catchError(err => throwError(() => err))
    );
  }
}
