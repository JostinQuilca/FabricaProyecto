export enum Role {
  ADMIN = 'ADMIN',
  DOCENTE = 'DOCENTE',
  ESTUDIANTE = 'ESTUDIANTE'
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: Role;
  createdAt?: string;
}

export interface AuthPayload {
  token: string;
  usuario: Usuario;
}
