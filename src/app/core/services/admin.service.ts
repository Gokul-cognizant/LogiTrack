import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuditLog, User, UserPromotionRequest } from '../models/user.model';
import { Role } from '../models/role.model';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/api/admin`;

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.base}/users`);
  }
  lookupUser(id: number): Observable<{ userId: number; name: string; email: string; role: Role; status: 'PENDING' | 'ACTIVE' | 'INACTIVE' }> {
    return this.http.get<{ userId: number; name: string; email: string; role: Role; status: 'PENDING' | 'ACTIVE' | 'INACTIVE' }>(
      `${this.base}/users/${id}/lookup`
    );
  }
  getByRole(role: Role): Observable<User[]> {
    return this.http.get<User[]>(`${this.base}/users/role/${role}`);
  }
  getPending(): Observable<User[]> {
    return this.http.get<User[]>(`${this.base}/users/pending`);
  }
  approve(id: number): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/users/${id}/approve`, {});
  }
  reject(id: number): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/users/${id}/reject`, {});
  }
  deactivate(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/users/${id}`);
  }
  reactivate(id: number): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/users/${id}/reactivate`, {});
  }
  updateRole(id: number, dto: UserPromotionRequest): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/users/${id}/updateRole`, dto);
  }
  auditLogs(): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.base}/audit-logs`);
  }
}
