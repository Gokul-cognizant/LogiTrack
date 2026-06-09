import { Component, inject, signal } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  styleUrls: ['../login/login.component.css'],
  template: `
  <div class="auth-shell">
    <div class="auth-side">
      <div class="auth-brand">
        <span class="auth-brand-mark">L</span>
        <span>LogiTrack</span>
      </div>
      <h1>Reset your password.</h1>
      <p>We'll send a one-time code to your email. Enter it along with your new password to regain access.</p>
    </div>
  
    <div class="auth-form-wrap">
      <div class="auth-card">
        <h2 class="auth-title">Forgot password</h2>
        <p class="auth-subtitle">Step {{ step() }} of 2</p>
  
        @if (error()) {
          <div class="alert alert-error">{{ error() }}</div>
        }
        @if (success()) {
          <div class="alert alert-success">{{ success() }}</div>
        }
        @if (info()) {
          <div class="alert alert-info">{{ info() }}</div>
        }
  
        <!-- STEP 1 — request OTP -->
        @if (step() === 1) {
          <form [formGroup]="emailForm" (ngSubmit)="sendOtp()">
            <div class="form-group">
              <label class="form-label">Email</label>
              <input type="email" class="form-control" formControlName="email" placeholder="you@example.com"
                [class.error]="emailForm.controls.email.touched && emailForm.controls.email.invalid"/>
              @if (emailForm.controls.email.touched && emailForm.controls.email.invalid) {
                <div class="form-error">
                  Enter a valid email.
                </div>
              }
            </div>
            <button type="submit" class="btn btn-primary auth-submit" [disabled]="loading()">
              @if (!loading()) {
                <span>Send OTP</span>
              }
              @if (loading()) {
                <span class="spinner"></span>
              }
            </button>
          </form>
        }
  
        <!-- STEP 2 — enter OTP + new password -->
        @if (step() === 2) {
          <form [formGroup]="resetForm" (ngSubmit)="reset()">
            <div class="form-group">
              <label class="form-label">OTP code</label>
              <input class="form-control" formControlName="otpCode" placeholder="6-digit code"
                [class.error]="resetForm.controls.otpCode.touched && resetForm.controls.otpCode.invalid"/>
            </div>
            <div class="form-group">
              <label class="form-label">New password</label>
              <input type="password" class="form-control" formControlName="newPassword" placeholder="At least 6 chars"
                [class.error]="resetForm.controls.newPassword.touched && resetForm.controls.newPassword.invalid"/>
            </div>
            <button type="submit" class="btn btn-primary auth-submit" [disabled]="loading()">
              @if (!loading()) {
                <span>Reset password</span>
              }
              @if (loading()) {
                <span class="spinner"></span>
              }
            </button>
          </form>
        }
  
        <p class="auth-footer">
          Remembered it? <a routerLink="/login">Back to sign in</a>
        </p>
      </div>
    </div>
  </div>
  `
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  step = signal<1 | 2>(1);
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  info = signal<string | null>(null);

  emailForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });

  resetForm = this.fb.nonNullable.group({
    otpCode: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]]
  });

  sendOtp() {
    if (this.emailForm.invalid) { this.emailForm.markAllAsTouched(); return; }
    this.loading.set(true); this.error.set(null); this.info.set(null);
    this.auth.requestOtp({ email: this.emailForm.controls.email.value }).subscribe({
      next: r => { this.loading.set(false); this.info.set(r.message); this.step.set(2); },
      error: (e: HttpErrorResponse) => { this.loading.set(false); this.error.set(this.msg(e)); }
    });
  }

  reset() {
    if (this.resetForm.invalid) { this.resetForm.markAllAsTouched(); return; }
    this.loading.set(true); this.error.set(null); this.success.set(null);
    this.auth.forgotPasswordReset({
      email: this.emailForm.controls.email.value,
      otpCode: this.resetForm.controls.otpCode.value,
      newPassword: this.resetForm.controls.newPassword.value
    }).subscribe({
      next: r => {
        this.loading.set(false);
        this.success.set(r.message + ' Redirecting to login...');
        setTimeout(() => this.router.navigate(['/login']), 1800);
      },
      error: (e: HttpErrorResponse) => { this.loading.set(false); this.error.set(this.msg(e)); }
    });
  }

  private msg(e: HttpErrorResponse) {
    if (e.status === 0) return 'Cannot reach backend. Check API base URL or CORS.';
    return e.error?.message || e.error?.error || e.message || 'Failed.';
  }
}
