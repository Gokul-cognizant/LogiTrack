import { Component, inject, signal } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { Role } from '../../../core/models/role.model';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);

  loading = signal(false);
  otpLoading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  otpMessage = signal<string | null>(null);

  selectableRoles: Role[] = ['CUSTOMER', 'DRIVER', 'DISPATCHER', 'FLEET_MANAGER', 'AUDITOR'];

  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    otpCode: ['', Validators.required],
    requestedRole: ['CUSTOMER' as Role, Validators.required]
  });

  requestOtp() {
    const email = this.form.controls.email.value;
    if (!email || this.form.controls.email.invalid) {
      this.form.controls.email.markAsTouched();
      return;
    }
    this.otpLoading.set(true);
    this.error.set(null);
    this.otpMessage.set(null);
    this.auth.requestOtp({ email }).subscribe({
      next: (r) => { this.otpLoading.set(false); this.otpMessage.set(r.message); },
      error: (e: HttpErrorResponse) => { this.otpLoading.set(false); this.error.set(this.extract(e)); }
    });
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);
    this.auth.register(this.form.getRawValue()).subscribe({
      next: (r) => { this.loading.set(false); this.success.set(r.message); this.form.reset({ requestedRole: 'CUSTOMER' }); },
      error: (e: HttpErrorResponse) => { this.loading.set(false); this.error.set(this.extract(e)); }
    });
  }

  private extract(err: HttpErrorResponse): string {
    if (err.status === 0) return 'Cannot reach backend. Check API base URL or CORS.';
    if (err.error?.message) return err.error.message;
    if (err.error?.error) return err.error.error;
    return err.message || 'Operation failed.';
  }
}
