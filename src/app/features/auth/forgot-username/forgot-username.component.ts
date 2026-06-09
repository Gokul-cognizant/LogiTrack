import { Component, inject, signal } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-username',
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
      <h1>Recover your email.</h1>
      <p>We'll text a code to your phone. Enter it and we'll show you the email tied to that number.</p>
    </div>
  
    <div class="auth-form-wrap">
      <div class="auth-card">
        <h2 class="auth-title">Forgot username</h2>
        <p class="auth-subtitle">Step {{ step() }} of 2</p>
  
        @if (error()) {
          <div class="alert alert-error">{{ error() }}</div>
        }
        @if (info()) {
          <div class="alert alert-info">{{ info() }}</div>
        }
        @if (recoveredEmail()) {
          <div class="alert alert-success">
            {{ recoveredEmail() }}
          </div>
        }
  
        <!-- STEP 1 — phone -->
        @if (step() === 1 && !recoveredEmail()) {
          <form [formGroup]="phoneForm" (ngSubmit)="sendOtp()">
            <div class="form-group">
              <label class="form-label">Phone number (10 digits)</label>
              <input class="form-control" formControlName="phoneNumber" placeholder="9876543210"
                [class.error]="phoneForm.controls.phoneNumber.touched && phoneForm.controls.phoneNumber.invalid"/>
            </div>
            <button type="submit" class="btn btn-primary auth-submit" [disabled]="loading()">
              @if (!loading()) {
                <span>Send OTP via SMS</span>
              }
              @if (loading()) {
                <span class="spinner"></span>
              }
            </button>
          </form>
        }
  
        <!-- STEP 2 — OTP -->
        @if (step() === 2 && !recoveredEmail()) {
          <form [formGroup]="verifyForm" (ngSubmit)="verify()">
            <div class="form-group">
              <label class="form-label">OTP code</label>
              <input class="form-control" formControlName="otpCode" placeholder="6-digit code"
                [class.error]="verifyForm.controls.otpCode.touched && verifyForm.controls.otpCode.invalid"/>
            </div>
            <button type="submit" class="btn btn-primary auth-submit" [disabled]="loading()">
              @if (!loading()) {
                <span>Recover email</span>
              }
              @if (loading()) {
                <span class="spinner"></span>
              }
            </button>
          </form>
        }
  
        <p class="auth-footer">
          <a routerLink="/login">Back to sign in</a>
        </p>
      </div>
    </div>
  </div>
  `
})
export class ForgotUsernameComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  step = signal<1 | 2>(1);
  loading = signal(false);
  error = signal<string | null>(null);
  info = signal<string | null>(null);
  recoveredEmail = signal<string | null>(null);

  phoneForm = this.fb.nonNullable.group({
    phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]]
  });
  verifyForm = this.fb.nonNullable.group({
    otpCode: ['', Validators.required]
  });

  sendOtp() {
    if (this.phoneForm.invalid) { this.phoneForm.markAllAsTouched(); return; }
    this.loading.set(true); this.error.set(null); this.info.set(null);
    this.auth.requestOtpByPhone({ phoneNumber: this.phoneForm.controls.phoneNumber.value }).subscribe({
      next: r => { this.loading.set(false); this.info.set(r.message); this.step.set(2); },
      error: (e: HttpErrorResponse) => { this.loading.set(false); this.error.set(this.msg(e)); }
    });
  }

  verify() {
    if (this.verifyForm.invalid) { this.verifyForm.markAllAsTouched(); return; }
    this.loading.set(true); this.error.set(null);
    this.auth.recoverUsername({
      phoneNumber: this.phoneForm.controls.phoneNumber.value,
      otpCode: this.verifyForm.controls.otpCode.value
    }).subscribe({
      next: r => { this.loading.set(false); this.recoveredEmail.set(r.username); },
      error: (e: HttpErrorResponse) => { this.loading.set(false); this.error.set(this.msg(e)); }
    });
  }

  private msg(e: HttpErrorResponse) {
    if (e.status === 0) return 'Cannot reach backend. Check API base URL or CORS.';
    return e.error?.message || e.error?.error || e.message || 'Failed.';
  }
}
