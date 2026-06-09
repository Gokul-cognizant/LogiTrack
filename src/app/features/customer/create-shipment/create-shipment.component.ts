import { Component, inject, signal } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ShipmentService } from '../../../core/services/shipment.service';

@Component({
  selector: 'app-create-shipment',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Place a new shipment</h1>
        <p class="page-subtitle">Provide pickup, delivery and receiver details.</p>
      </div>
    </div>
  
    <div class="card" style="max-width: 720px;">
      @if (error()) {
        <div class="alert alert-error">{{ error() }}</div>
      }
      @if (success()) {
        <div class="alert alert-success">{{ success() }}</div>
      }
  
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Origin</label>
            <input class="form-control" formControlName="origin" placeholder="Chennai"/>
          </div>
          <div class="form-group">
            <label class="form-label">Destination</label>
            <input class="form-control" formControlName="destination" placeholder="Bangalore"/>
          </div>
        </div>
  
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Weight (kg)</label>
            <input type="number" class="form-control" formControlName="weight" min="0.1" step="0.1"/>
          </div>
          <div class="form-group">
            <label class="form-label">Receiver phone</label>
            <input class="form-control" formControlName="receiverPhone" placeholder="9876543210"/>
          </div>
        </div>
  
        <div class="form-group">
          <label class="form-label">Receiver name</label>
          <input class="form-control" formControlName="receiverName" placeholder="Ravi Kumar"/>
        </div>
  
        <div style="display:flex; gap:10px; margin-top: 10px;">
          <button type="submit" class="btn btn-primary" [disabled]="loading()">
            @if (!loading()) {
              <span>Create shipment</span>
            }
            @if (loading()) {
              <span class="spinner" style="width:16px;height:16px;border-width:2px;border-top-color:#fff;"></span>
            }
          </button>
          <button type="button" class="btn btn-secondary" (click)="form.reset()">Reset</button>
        </div>
      </form>
    </div>
  </div>
  `
})
export class CreateShipmentComponent {
  private fb = inject(FormBuilder);
  private svc = inject(ShipmentService);
  private router = inject(Router);

  loading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    origin: ['', Validators.required],
    destination: ['', Validators.required],
    weight: [0, [Validators.required, Validators.min(0.1)]],
    receiverName: ['', Validators.required],
    receiverPhone: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]]
  });

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);
    this.svc.create(this.form.getRawValue()).subscribe({
      next: s => {
        this.loading.set(false);
        this.success.set(`Shipment #${s.shipmentId} created. Delivery OTP: ${s.deliveryOtp ?? 'pending'}`);
        setTimeout(() => this.router.navigate(['/customer/orders']), 1500);
      },
      error: (e: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(e.error?.message || e.error?.error || e.message || 'Failed.');
      }
    });
  }
}
