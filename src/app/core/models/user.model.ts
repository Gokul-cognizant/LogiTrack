import { Role } from './role.model';
export type { Role };

export type UserStatus = 'PENDING' | 'ACTIVE' | 'INACTIVE';

export interface User {
  userId: number;
  email: string;
  name: string;
  phoneNumber: string;
  role: Role;
  status: UserStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuditLog {
  auditId: number;
  userId: number;
  action: string;
  details: string;
  timestamp: string;
}

// PUT /api/admin/users/{id}/updateRole
export interface UserPromotionRequest {
  newRole: Role;
  licenseNumber?: string;
  contactInfo?: string;
}
