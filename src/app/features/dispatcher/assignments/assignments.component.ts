import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DispatchService } from '../../../core/services/dispatch.service';
import { DriverAssignment } from '../../../core/models/dispatch.model';

@Component({
  selector: 'app-assignments',
  standalone: true,
  imports: [CommonModule],
  template: `
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Driver Assignments</h1>
        <p class="page-subtitle">Every driver assignment ever created.</p>
      </div>
    </div>
  
    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }
    <div class="card">
      @if (loading()) {
        <div class="spinner-center"><span class="spinner spinner-lg"></span></div>
      }
  
      @if (!loading() && rows().length === 0) {
        <div class="empty-state"><h4>No assignments</h4></div>
      }
  
      @if (!loading() && rows().length > 0) {
        <div class="table-wrapper">
          <table class="table">
            <thead><tr><th>#</th><th>Driver</th><th>Vehicle</th><th>Route</th><th>Assigned By</th><th>At</th><th>Status</th></tr></thead>
            <tbody>
              @for (a of rows(); track a) {
                <tr>
                  <td>#{{ a.assignId }}</td>
                  <td>{{ a.driverId }}</td>
                  <td>{{ a.vehicleId }}</td>
                  <td>{{ a.routeId }}</td>
                  <td>{{ a.assignedBy }}</td>
                  <td>{{ a.assignedAt | date: 'medium' }}</td>
                  <td><span class="badge" [ngClass]="a.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'">{{ a.status }}</span></td>
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
export class AssignmentsComponent implements OnInit {
  private svc = inject(DispatchService);
  loading = signal(true);
  error = signal<string | null>(null);
  rows = signal<DriverAssignment[]>([]);

  ngOnInit() {
    this.svc.getAllAssignments().subscribe({
      next: r => { this.rows.set(r); this.loading.set(false); },
      error: e => { this.error.set(e.error?.message || 'Failed to load.'); this.loading.set(false); }
    });
  }
}
