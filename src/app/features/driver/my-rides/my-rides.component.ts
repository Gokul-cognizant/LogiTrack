import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { DriverService } from '../../../core/services/driver.service';
import { DriverRide } from '../../../core/models/driver.model';

@Component({
  selector: 'app-my-rides',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">My Rides</h1>
        <p class="page-subtitle">Scheduled and in-transit deliveries.</p>
      </div>
    </div>
  
    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }
    @if (message()) {
      <div class="alert alert-success">{{ message() }}</div>
    }
  
    @if (loading()) {
      <div class="spinner-center"><span class="spinner spinner-lg"></span></div>
    }
  
    @if (!loading() && rides().length === 0) {
      <div class="card">
        <div class="empty-state"><h4>No rides assigned</h4><p>A dispatcher will assign rides to you here.</p></div>
      </div>
    }
  
    @if (!loading() && rides().length > 0) {
      <div class="rides-grid">
        @for (r of rides(); track r) {
          <div class="ride-card">
            <div class="ride-header">
              <div>
                <div class="ride-route">{{ r.origin }} → {{ r.destination }}</div>
                <div class="ride-sub">Shipment #{{ r.shipmentId }} · Schedule #{{ r.scheduleId }}</div>
              </div>
              <span class="badge" [ngClass]="badgeClass(r.status)">{{ r.status }}</span>
            </div>
            <div class="ride-body">
              <div><strong>Receiver:</strong> {{ r.receiverName }} ({{ r.receiverPhone }})</div>
              <div><strong>Vehicle:</strong> #{{ r.vehicleId }} · <strong>Route:</strong> #{{ r.routeId }}</div>
              <div><strong>Departure:</strong> {{ r.departureAt | date:'medium' }}</div>
              <div><strong>Arrival:</strong> {{ r.arrivalAt | date:'medium' }}</div>
            </div>
            <div class="ride-actions">
              @if (r.status === 'SCHEDULED') {
                <button class="btn btn-secondary btn-sm" (click)="start(r.scheduleId)">Start trip</button>
              }
              @if (r.status === 'IN_TRANSIT' || r.status === 'SCHEDULED') {
                <a [routerLink]="['/driver/complete', r.shipmentId]" class="btn btn-primary btn-sm">Complete delivery</a>
              }
            </div>
          </div>
        }
      </div>
    }
  </div>
  `,
  styles: [`
    .rides-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 16px; }
    .ride-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px 20px; box-shadow: var(--shadow-sm); }
    .ride-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid var(--border); }
    .ride-route { font-size: 16px; font-weight: 600; }
    .ride-sub { font-size: 12px; color: var(--text-muted); margin-top: 4px; }
    .ride-body { display: grid; gap: 6px; font-size: 13px; color: var(--text); }
    .ride-body strong { color: var(--text-muted); font-weight: 600; }
    .ride-actions { display: flex; gap: 8px; margin-top: 14px; }
  `]
})
export class MyRidesComponent implements OnInit {
  private svc = inject(DriverService);
  loading = signal(true);
  error = signal<string | null>(null);
  message = signal<string | null>(null);
  rides = signal<DriverRide[]>([]);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.myRides().subscribe({
      next: r => { this.rides.set(r); this.loading.set(false); },
      error: (e: HttpErrorResponse) => { this.error.set(e.error?.message || 'Failed to load.'); this.loading.set(false); }
    });
  }

  start(scheduleId: number) {
    this.svc.startTrip(scheduleId).subscribe({
      next: r => { this.message.set(r.message); this.load(); },
      error: e => this.error.set(e.error?.message || 'Failed to start trip.')
    });
  }

  badgeClass(s: string): string {
    if (s === 'SCHEDULED') return 'badge-warning';
    if (s === 'IN_TRANSIT') return 'badge-info';
    if (s === 'COMPLETED') return 'badge-success';
    return 'badge-default';
  }
}
