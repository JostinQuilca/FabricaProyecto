import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  const expectedRoles = route.data['roles'] as Array<string>;
  const userRole = authService.getUserRole();

  if (userRole && expectedRoles.includes(userRole)) {
    return true;
  }

  // User doesn't have the required role, redirect to their specific dashboard or login
  if (authService.isAuthenticated()) {
    return router.parseUrl('/dashboard');
  }
  
  return router.parseUrl('/login');
};
