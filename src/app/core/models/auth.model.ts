import { Role } from './role.model';

// POST /api/auth/login
export interface LoginRequest {
  email: string;
  password: string;
}

export interface JwtResponse {
  token: string;
  type?: string;
}

// POST /api/auth/register
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  otpCode: string;
  requestedRole: Role;
}

// POST /api/otp/request
export interface OtpRequest {
  email: string;
}

// POST /api/otp/verify
export interface OtpVerificationRequest {
  email: string;
  code: string;
}

// POST /api/auth/forgot-password/reset
export interface PasswordResetRequest {
  email: string;
  otpCode: string;
  newPassword: string;
}

// POST /api/auth/request-by-phone
export interface PhoneOtpRequest {
  phoneNumber: string;
}

// POST /api/auth/forgot-username/verify
export interface UsernameRecoveryRequest {
  phoneNumber: string;
  otpCode: string;
}

// Decoded JWT payload
export interface DecodedJwt {
  sub: string;       // email
  role: Role;
  userId: number;
  iat: number;
  exp: number;
}

export interface CurrentUser {
  email: string;
  userId: number;
  role: Role;
  token: string;
  exp: number;
}
