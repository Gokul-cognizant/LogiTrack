import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ShipmentService } from '../../../core/services/shipment.service';
import { DriverService } from '../../../core/services/driver.service';
import { Shipment } from '../../../core/models/shipment.model';
import { DeliveryRecord } from '../../../core/models/driver.model';

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">My Orders</h1>
        <p class="page-subtitle">Track all shipments you have placed.</p>
      </div>
    </div>
  
    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }
    @if (success()) {
      <div class="alert alert-success">{{ success() }}</div>
    }
  
    <div class="card">
      @if (loading()) {
        <div class="spinner-center"><span class="spinner spinner-lg"></span></div>
      }
  
      @if (!loading() && orders().length === 0) {
        <div class="empty-state">
          <h4>No orders yet</h4>
          <p>Place a shipment to see it here.</p>
        </div>
      }
  
      @if (!loading() && orders().length > 0) {
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>#</th>
                <th>From → To</th>
                <th>Weight</th>
                <th>Receiver</th>
                <th>Status</th>
                <th>OTP</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (s of orders(); track s) {
                <tr>
                  <td>#{{ s.shipmentId }}</td>
                  <td>{{ s.origin }} → {{ s.destination }}</td>
                  <td>{{ s.weight }} kg</td>
                  <td>{{ s.receiverName }}<br/><small style="color:var(--text-muted)">{{ s.receiverPhone }}</small></td>
                  <td><span class="badge" [ngClass]="badgeClass(s.status)">{{ s.status }}</span></td>
                  <td><code>{{ s.deliveryOtp || '—' }}</code></td>
                  <td>
                    @if (s.status !== 'DELIVERED' && s.status !== 'CANCELLED') {
                      <button
                        class="btn btn-secondary btn-sm" (click)="regenerate(s)">
                        Regenerate OTP
                      </button>
                    }
                    @if (s.status === 'DELIVERED') {
                      <span class="badge badge-success">
                        OTP Verified
                      </span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  
    <!-- Records modal -->
    @if (recordTarget()) {
      <div class="modal-backdrop" (click)="closeRecord()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h3>Delivery record for shipment #{{ recordTarget()?.shipmentId }}</h3>
          @if (recordLoading()) {
            <div class="spinner-center"><span class="spinner"></span></div>
          }
          @if (!recordLoading() && records().length === 0) {
            <div class="empty-state">
              <h4>No record found</h4>
              <p>The driver may not have completed delivery yet.</p>
            </div>
          }
          @if (!recordLoading() && records().length > 0) {
            <div class="table-wrapper">
              <table class="table">
                <thead><tr><th>#</th><th>Driver</th><th>Vehicle</th><th>Delivered At</th><th>Status</th></tr></thead>
                <tbody>
                  @for (r of records(); track r) {
                    <tr>
                      <td>#{{ r.deliveryId }}</td>
                      <td>#{{ r.driverId }}</td>
                      <td>#{{ r.vehicleId }}</td>
                      <td>{{ r.deliveredAt | date:'medium' }}</td>
                      <td><span class="badge badge-success">{{ r.status }}</span></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
          <div style="display:flex; justify-content:flex-end; margin-top: 16px;">
            <button class="btn btn-secondary" (click)="closeRecord()">Close</button>
          </div>
        </div>
      </div>
    }
  </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed; inset: 0; background: rgba(15, 23, 42, 0.45);
      display: flex; align-items: center; justify-content: center; z-index: 100;
    }
    .modal-card {
      background: var(--surface); border-radius: 12px; padding: 24px 28px;
      width: 100%; max-width: 640px; box-shadow: var(--shadow);
    }
    .modal-card h3 { margin: 0 0 14px; font-size: 18px; }
  `]
})
export class MyOrdersComponent implements OnInit {
  private svc = inject(ShipmentService);
  private driver = inject(DriverService);

  loading = signal(true);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  orders = signal<Shipment[]>([]);

  recordTarget = signal<Shipment | null>(null);
  recordLoading = signal(false);
  records = signal<DeliveryRecord[]>([]);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.myOrders().subscribe({
      next: r => { this.orders.set(r); this.loading.set(false); },
      error: (e: HttpErrorResponse) => { this.error.set(e.error?.message || 'Failed to load orders.'); this.loading.set(false); }
    });
  }

  regenerate(s: Shipment) {
    if (!confirm(`Regenerate the delivery OTP for shipment #${s.shipmentId}?`)) return;
    this.error.set(null); this.success.set(null);
    this.svc.regenerateOtp(s.shipmentId).subscribe({
      next: r => { this.success.set(`New OTP for #${r.shipmentId}: ${r.deliveryOtp}`); this.load(); },
      error: (e: HttpErrorResponse) => this.error.set(e.error?.message || 'Failed.')
    });
  }

  viewRecord(s: Shipment) {
    this.recordTarget.set(s);
    this.recordLoading.set(true);
    this.records.set([]);
    this.driver.getRecords(s.shipmentId).subscribe({
      next: r => { this.records.set(r); this.recordLoading.set(false); },
      error: () => { this.recordLoading.set(false); }
    });
  }
  closeRecord() { this.recordTarget.set(null); this.records.set([]); }

  badgeClass(s: string): string {
    switch (s) {
      case 'PENDING': return 'badge-warning';
      case 'ACCEPTED': return 'badge-info';
      case 'IN_TRANSIT': return 'badge-info';
      case 'DELIVERED': return 'badge-success';
      case 'CANCELLED': return 'badge-danger';
      default: return 'badge-default';
    }
  }
}
