import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { DispatchService } from '../../../core/services/dispatch.service';
import { Shipment } from '../../../core/models/shipment.model';

@Component({
  selector: 'app-shipments-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">All Shipments</h1>
        <p class="page-subtitle">Browse shipments across the system and dispatch them.</p>
      </div>
      <a routerLink="/dispatcher/dispatch" class="btn btn-primary">+ Dispatch shipment</a>
    </div>
  
    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }
  
    <div class="card">
      @if (loading()) {
        <div class="spinner-center"><span class="spinner spinner-lg"></span></div>
      }
  
      @if (!loading() && shipments().length === 0) {
        <div class="empty-state">
          <h4>No shipments yet</h4>
          <p>Once customers create shipments, they will appear here.</p>
        </div>
      }
  
      @if (!loading() && shipments().length > 0) {
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>#</th>
                <th>From → To</th>
                <th>Weight</th>
                <th>Customer</th>
                <th>Receiver</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (s of shipments(); track s) {
                <tr>
                  <td>#{{ s.shipmentId }}</td>
                  <td>{{ s.origin }} → {{ s.destination }}</td>
                  <td>{{ s.weight }} kg</td>
                  <td>{{ s.customerId }}</td>
                  <td>{{ s.receiverName }}<br/><small style="color:var(--text-muted)">{{ s.receiverPhone }}</small></td>
                  <td><span class="badge" [ngClass]="badgeClass(s.status)">{{ s.status }}</span></td>
                  <td>
                    @if (s.status === 'PENDING') {
                      <button class="btn btn-secondary btn-sm" (click)="cancel(s.shipmentId)">
                        Cancel
                      </button>
                    }
                    @if (s.status === 'ACCEPTED' || s.status === 'IN_TRANSIT') {
                      <button class="btn btn-danger btn-sm" (click)="cancelDispatch(s.shipmentId)">
                        Cancel dispatch
                      </button>
                    }
                    @if (s.status === 'DELIVERED' || s.status === 'CANCELLED') {
                      <span style="color: var(--text-muted)">—</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  </div>
  `
})
export class ShipmentsListComponent implements OnInit {
  private svc = inject(DispatchService);
  loading = signal(true);
  error = signal<string | null>(null);
  shipments = signal<Shipment[]>([]);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getShipments().subscribe({
      next: r => { this.shipments.set(r); this.loading.set(false); },
      error: (e: HttpErrorResponse) => { this.error.set(e.error?.message || 'Failed to load.'); this.loading.set(false); }
    });
  }

  cancel(id: number) {
    if (!confirm(`Cancel shipment #${id}?`)) return;
    this.svc.cancelShipment(id).subscribe({
      next: () => this.load(),
      error: e => this.error.set(e.error?.message || 'Cancel failed.')
    });
  }

  cancelDispatch(id: number) {
    if (!confirm(`Cancel the dispatch for shipment #${id}?`)) return;
    this.svc.cancelDispatch(id).subscribe({
      next: () => this.load(),
      error: e => this.error.set(e.error?.message || 'Cancel dispatch failed.')
    });
  }

  badgeClass(s: string): string {
    switch (s) {
      case 'PENDING': return 'badge-warning';
      case 'ACCEPTED': case 'IN_TRANSIT': return 'badge-info';
      case 'DELIVERED': return 'badge-success';
      case 'CANCELLED': return 'badge-danger';
      default: return 'badge-default';
    }
  }
}
