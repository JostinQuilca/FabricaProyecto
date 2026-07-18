import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component').then(c => c.LoginComponent)
  },
  {
    path: 'registro',
    loadComponent: () => import('./pages/registro/registro.component').then(c => c.RegistroComponent)
  },
  {
    path: 'recuperar-password',
    loadComponent: () => import('./pages/recuperar-password/recuperar-password.component').then(c => c.RecuperarPasswordComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(c => c.DashboardComponent),
    canActivate: [authGuard]
  },
  // Sprint 2 · CA-016 Materias
  {
    path: 'materias',
    loadComponent: () => import('./pages/materias/materias.component').then(c => c.MateriasComponent),
    canActivate: [authGuard]
  },
  // Sprint 2 · CA-017 Inscripciones
  {
    path: 'inscripciones',
    loadComponent: () => import('./pages/inscripciones/inscripciones.component').then(c => c.InscripcionesComponent),
    canActivate: [authGuard]
  },
  // Sprint 2 · CA-012 Auditoría
  {
    path: 'auditoria',
    loadComponent: () => import('./pages/auditoria/auditoria.component').then(c => c.AuditoriaComponent),
    canActivate: [authGuard]
  },
  // Sprint 2 · HU-S2.5 Panel de Administración (exclusivo ADMIN)
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/admin.component').then(c => c.AdminComponent),
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] }
  },
  { path: '**', redirectTo: 'login' }
];
