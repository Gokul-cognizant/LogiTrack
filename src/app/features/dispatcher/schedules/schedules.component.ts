import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DispatchService } from '../../../core/services/dispatch.service';
import { RouteSchedule, ScheduleStatus } from '../../../core/models/dispatch.model';

@Component({
  selector: 'app-schedules',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Route Schedules</h1>
        <p class="page-subtitle">Every scheduled, in-transit, completed and cancelled dispatch.</p>
      </div>
    </div>
  
    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }
    @if (success()) {
      <div class="alert alert-success">{{ success() }}</div>
    }
  
    <!-- Vehicle availability checker -->
    <div class="card" style="margin-bottom: 20px;">
      <div class="card-header"><h3 class="card-title">Check vehicle availability</h3></div>
      <form [formGroup]="availForm" (ngSubmit)="checkAvail()">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Vehicle ID</label>
            <input type="number" class="form-control" formControlName="vehicleId" min="1"/>
          </div>
          <div class="form-group">
            <label class="form-label">Start</label>
            <input type="datetime-local" class="form-control" formControlName="start"/>
          </div>
          <div class="form-group">
            <label class="form-label">End</label>
            <input type="datetime-local" class="form-control" formControlName="end"/>
          </div>
        </div>
        <button type="submit" class="btn btn-primary" [disabled]="checking()">
          @if (!checking()) {
            <span>Check</span>
          }
          @if (checking()) {
            <span class="spinner" style="width:16px;height:16px;border-width:2px;border-top-color:#fff;"></span>
          }
        </button>
        @if (availResult() !== null) {
          <span class="badge"
            [ngClass]="availResult() ? 'badge-success' : 'badge-danger'"
            style="margin-left:12px;">
            {{ availMessage() }}
          </span>
        }
      </form>
    </div>
  
    <div class="card">
      <div class="card-header"><h3 class="card-title">All schedules</h3></div>
      @if (loading()) {
        <div class="spinner-center"><span class="spinner spinner-lg"></span></div>
      }
      @if (!loading() && rows().length === 0) {
        <div class="empty-state"><h4>No schedules yet</h4></div>
      }
      @if (!loading() && rows().length > 0) {
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>#</th><th>Shipment</th><th>Vehicle</th><th>Route</th>
                <th>Departure</th><th>Arrival</th><th>Dispatcher</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (s of rows(); track s) {
                <tr>
                  <td>#{{ s.scheduleId }}</td>
                  <td>#{{ s.shipmentId }}</td>
                  <td>#{{ s.vehicleId }}</td>
                  <td>#{{ s.routeId }}</td>
                  <td>{{ s.departureAt | date:'medium' }}</td>
                  <td>{{ s.arrivalAt | date:'medium' }}</td>
                  <td>{{ s.dispatcherId }}</td>
                  <td><span class="badge" [ngClass]="badge(s.status)">{{ s.status }}</span></td>
                  <td>
                    <button class="btn btn-secondary btn-sm" (click)="openStatus(s)">Update status</button>
                    <button class="btn btn-danger btn-sm" (click)="remove(s.scheduleId)" style="margin-left:6px;">Delete</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  
    <!-- Status modal -->
    @if (statusTarget()) {
      <div class="modal-backdrop" (click)="cancelStatus()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h3>Update schedule #{{ statusTarget()?.scheduleId }} status</h3>
          <form [formGroup]="statusForm" (ngSubmit)="applyStatus()">
            <div class="form-group">
              <label class="form-label">New status</label>
              <select class="form-control" formControlName="status">
                <option value="SCHEDULED">SCHEDULED</option>
                <option value="IN_TRANSIT">IN_TRANSIT</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
            <div style="display:flex; gap:8px;">
              <button type="submit" class="btn btn-primary" [disabled]="saving()">Apply</button>
              <button type="button" class="btn btn-secondary" (click)="cancelStatus()">Cancel</button>
            </div>
          </form>
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
      width: 100%; max-width: 460px; box-shadow: var(--shadow);
    }
    .modal-card h3 { margin: 0 0 14px; font-size: 18px; }
  `]
})
export class SchedulesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private svc = inject(DispatchService);

  loading = signal(true);
  saving = signal(false);
  checking = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  rows = signal<RouteSchedule[]>([]);

  statusTarget = signal<RouteSchedule | null>(null);
  statusForm = this.fb.nonNullable.group({
    status: ['SCHEDULED' as ScheduleStatus, Validators.required]
  });

  availResult = signal<boolean | null>(null);
  availMessage = signal<string>('');
  availForm = this.fb.nonNullable.group({
    vehicleId: [1, [Validators.required, Validators.min(1)]],
    start: ['', Validators.required],
    end: ['', Validators.required]
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getAllSchedules().subscribe({
      next: r => { this.rows.set(r); this.loading.set(false); },
      error: (e: HttpErrorResponse) => { this.error.set(this.msg(e)); this.loading.set(false); }
    });
  }

  openStatus(s: RouteSchedule) {
    this.error.set(null); this.success.set(null);
    this.statusTarget.set(s);
    this.statusForm.reset({ status: s.status });
  }
  cancelStatus() { this.statusTarget.set(null); }
  applyStatus() {
    const s = this.statusTarget(); if (!s) return;
    this.saving.set(true);
    this.svc.updateScheduleStatus(s.scheduleId, this.statusForm.controls.status.value).subscribe({
      next: r => { this.saving.set(false); this.success.set(r.message); this.statusTarget.set(null); this.load(); },
      error: (e: HttpErrorResponse) => { this.saving.set(false); this.error.set(this.msg(e)); }
    });
  }

  remove(id: number) {
    if (!confirm(`Delete schedule #${id}?`)) return;
    this.error.set(null); this.success.set(null);
    this.svc.deleteSchedule(id).subscribe({
      next: r => { this.success.set(r.message); this.load(); },
      error: (e: HttpErrorResponse) => this.error.set(this.msg(e))
    });
  }

  checkAvail() {
    if (this.availForm.invalid) { this.availForm.markAllAsTouched(); return; }
    this.checking.set(true);
    this.availResult.set(null);
    this.availMessage.set('');
    const v = this.availForm.getRawValue();
    this.svc.checkAvailability(v.vehicleId, v.start, v.end).subscribe({
      next: r => {
        this.checking.set(false);
        this.availResult.set(r.available);
        this.availMessage.set(r.message
          ?? (r.available ? 'AVAILABLE' : 'BUSY (overlapping schedule exists)'));
      },
      error: (e: HttpErrorResponse) => {
        this.checking.set(false);
        const serverMsg = e.error?.message;
        if (e.status === 404 && serverMsg) {
          this.availResult.set(false);
          this.availMessage.set(serverMsg);
        } else {
          this.error.set(this.msg(e));
        }
      }
    });
  }

  badge(s: string): string {
    if (s === 'SCHEDULED') return 'badge-warning';
    if (s === 'IN_TRANSIT') return 'badge-info';
    if (s === 'COMPLETED') return 'badge-success';
    if (s === 'CANCELLED') return 'badge-danger';
    return 'badge-default';
  }

  private msg(e: HttpErrorResponse) { return e.error?.message || e.error?.error || e.message || 'Failed'; }
}
