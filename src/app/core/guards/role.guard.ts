import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Role } from '../models/role.model';

export const roleGuard = (...allowed: Role[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.isAuthed()) {
      router.navigate(['/login']);
      return false;
    }
    if (auth.hasRole(...allowed)) return true;
    router.navigate(['/dashboard']);
    return false;
  };
};
