import { Component, OnInit, inject, signal } from '@angular/core';

import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { DriverService } from '../../../core/services/driver.service';
import { ShipmentService } from '../../../core/services/shipment.service';

@Component({
  selector: 'app-complete-delivery',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Complete delivery</h1>
        <p class="page-subtitle">Verify the OTP, attach a proof, and close the trip.</p>
      </div>
      <a routerLink="/driver/rides" class="btn btn-secondary">← Back to rides</a>
    </div>
  
    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }
    @if (success()) {
      <div class="alert alert-success">{{ success() }}</div>
    }
  
    <div class="card" style="max-width: 600px;">
      <div class="card-header">
        <h3 class="card-title">Shipment #{{ shipmentId() }}</h3>
        @if (receiver()) {
          <p class="card-subtitle">Receiver: {{ receiver() }}</p>
        }
      </div>
  
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="form-group">
          <label class="form-label">Delivery OTP</label>
          <input class="form-control" formControlName="otp" placeholder="6-digit code from receiver"
            [class.error]="form.controls.otp.touched && form.controls.otp.invalid"/>
        </div>
  
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Proof file URI</label>
            <input class="form-control" formControlName="fileUri" placeholder="e.g. delivery-1.png"/>
          </div>
          <div class="form-group">
            <label class="form-label">Distance (km)</label>
            <input type="number" class="form-control" formControlName="distance" min="0" step="0.1"/>
          </div>
        </div>
  
        <div class="form-group">
          <label class="form-label">Notes (optional)</label>
          <textarea class="form-control" rows="3" formControlName="notes" placeholder="Delivery condition, receiver remarks..."></textarea>
        </div>
  
        <button type="submit" class="btn btn-primary" [disabled]="loading()">
          @if (!loading()) {
            <span>Complete delivery</span>
          }
          @if (loading()) {
            <span class="spinner" style="width:16px;height:16px;border-width:2px;border-top-color:#fff;"></span>
          }
        </button>
      </form>
    </div>
  </div>
  `
})
export class CompleteDeliveryComponent implements OnInit {
  private fb = inject(FormBuilder);
  private driver = inject(DriverService);
  private shipment = inject(ShipmentService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  shipmentId = signal<number>(0);
  receiver = signal<string>('');
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    otp: ['', Validators.required],
    fileUri: ['delivery-proof.png', Validators.required],
    distance: [0, [Validators.required, Validators.min(0.1)]],
    notes: ['']
  });

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.shipmentId.set(id);
    this.shipment.getById(id).subscribe({
      next: s => this.receiver.set(`${s.receiverName} (${s.receiverPhone})`),
      error: () => {}
    });
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);
    this.driver.completeDelivery(this.shipmentId(), this.form.getRawValue()).subscribe({
      next: r => { this.loading.set(false); this.success.set(r.message); setTimeout(() => this.router.navigate(['/driver/rides']), 1500); },
      error: (e: HttpErrorResponse) => { this.loading.set(false); this.error.set(e.error?.message || e.error?.error || e.message || 'Completion failed.'); }
    });
  }
}
