import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CurrentUser, DecodedJwt, JwtResponse,
  LoginRequest, OtpRequest, OtpVerificationRequest,
  PasswordResetRequest, PhoneOtpRequest,
  RegisterRequest, UsernameRecoveryRequest
} from '../models/auth.model';
import { Role } from '../models/role.model';

const STORAGE_KEY = 'logitrack.auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private base = environment.apiBaseUrl;

  // Reactive current user via signal
  private _user = signal<CurrentUser | null>(this.readStored());
  user = computed(() => this._user());
  isAuthed = computed(() => {
    const u = this._user();
    if (!u) return false;
    return Date.now() < u.exp * 1000;
  });
  role = computed(() => this._user()?.role ?? null);

  login(req: LoginRequest): Observable<JwtResponse> {
    return this.http.post<JwtResponse>(`${this.base}/api/auth/login`, req).pipe(
      tap(res => this.setSession(res.token))
    );
  }

  register(req: RegisterRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/api/auth/register`, req);
  }

  requestOtp(req: OtpRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/api/otp/request`, req);
  }

  /* OTP verify (standalone) — backend: POST /api/otp/verify */
  verifyOtp(req: OtpVerificationRequest): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.base}/api/otp/verify`, req);
  }

  /* Forgot password — request OTP via email then reset */
  forgotPasswordReset(req: PasswordResetRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/api/auth/forgot-password/reset`, req);
  }

  /* Forgot username — request OTP via phone */
  requestOtpByPhone(req: PhoneOtpRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/api/auth/request-by-phone`, req);
  }

  /* Forgot username — verify OTP via phone → returns email */
  recoverUsername(req: UsernameRecoveryRequest): Observable<{ username: string }> {
    return this.http.post<{ username: string }>(`${this.base}/api/auth/forgot-username/verify`, req);
  }

  logout(): void {
    const token = this._user()?.token;
    if (token) {
      // best-effort, ignore failures
      this.http.post(`${this.base}/api/auth/logout`, {}).subscribe({ next: () => {}, error: () => {} });
    }
    localStorage.removeItem(STORAGE_KEY);
    this._user.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this._user()?.token ?? null;
  }

  hasRole(...roles: Role[]): boolean {
    const r = this._user()?.role;
    return !!r && roles.includes(r);
  }

  private setSession(token: string): void {
    const decoded = this.decode(token);
    if (!decoded) {
      throw new Error('Invalid JWT received from server.');
    }
    const cu: CurrentUser = {
      email: decoded.sub,
      userId: Number(decoded.userId),
      role: decoded.role,
      token,
      exp: decoded.exp
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cu));
    this._user.set(cu);
  }

  private readStored(): CurrentUser | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const cu: CurrentUser = JSON.parse(raw);
      if (Date.now() >= cu.exp * 1000) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      return cu;
    } catch {
      return null;
    }
  }

  private decode(token: string): DecodedJwt | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = atob(payload);
      return JSON.parse(json) as DecodedJwt;
    } catch {
      return null;
    }
  }
}
