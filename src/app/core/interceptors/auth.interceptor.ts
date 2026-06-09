
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  const isPublic =
    req.url.includes('/api/auth/login') ||
    req.url.includes('/api/auth/register') ||
    req.url.includes('/api/auth/forgot-password') ||
    req.url.includes('/api/auth/request-by-phone') ||
    req.url.includes('/api/auth/forgot-username') ||
    req.url.includes('/api/auth/logout') ||
    req.url.includes('/api/otp/');

  const token = auth.getToken();
  
  const setHeaders: Record<string, string> = {};
  if (!isPublic && token) setHeaders['Authorization'] = `Bearer ${token}`;

  let cloned = req.clone({ setHeaders });

  return next(cloned).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !isPublic) {
        auth.logout();
      }
      return throwError(() => err);
    })
  );
};
