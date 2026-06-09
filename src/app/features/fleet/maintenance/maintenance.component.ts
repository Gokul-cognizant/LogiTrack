import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { FleetService } from '../../../core/services/fleet.service';
import { MaintenanceRecord } from '../../../core/models/vehicle.model';

@Component({
  selector: 'app-maintenance',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Maintenance Tickets</h1>
        <p class="page-subtitle">Auto-generated tickets from failed inspections, plus manual tracking. Start a ticket to lock the vehicle, complete to release.</p>
      </div>
    </div>
  
    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }
    @if (success()) {
      <div class="alert alert-success">{{ success() }}</div>
    }
  
    <div class="card">
      <div class="card-header"><h3 class="card-title">All maintenance records</h3></div>
      @if (loading()) {
        <div class="spinner-center"><span class="spinner spinner-lg"></span></div>
      }
  
      @if (!loading() && records().length === 0) {
        <div class="empty-state">
          <h4>No maintenance records</h4>
          <p>Tickets appear when an inspection fails.</p>
        </div>
      }
  
      @if (!loading() && records().length > 0) {
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr><th>#</th><th>Vehicle</th><th>Task</th><th>Mechanic</th><th>Cost</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              @for (m of records(); track m) {
                <tr>
                  <td>#{{ m.maintId }}</td>
                  <td>#{{ m.vehicleId }}</td>
                  <td><small>{{ m.taskDescription }}</small></td>
                  <td>{{ m.performedBy || '—' }}</td>
                  <td>{{ m.cost ? '₹ ' + m.cost : '—' }}</td>
                  <td><span class="badge" [ngClass]="badge(m.status)">{{ m.status }}</span></td>
                  <td>
                    @if (m.status === 'PENDING') {
                      <button class="btn btn-secondary btn-sm" (click)="openStart(m)">Start</button>
                    }
                    @if (m.status === 'IN_PROGRESS') {
                      <button class="btn btn-success btn-sm" (click)="openComplete(m)">Complete</button>
                    }
                    @if (m.status === 'COMPLETED') {
                      <span style="color:var(--text-muted)">—</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  
    <!-- Start modal -->
    @if (startTarget()) {
      <div class="modal-backdrop" (click)="cancelStart()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h3>Start maintenance #{{ startTarget()?.maintId }}</h3>
          <p class="card-subtitle">Vehicle status will become IN_MAINTENANCE (locked from dispatch).</p>
          <form [formGroup]="startForm" (ngSubmit)="confirmStart()">
            <div class="form-group">
              <label class="form-label">Mechanic name</label>
              <input class="form-control" formControlName="mechanicName" placeholder="e.g. Ravi"/>
            </div>
            <div style="display:flex; gap:8px;">
              <button type="submit" class="btn btn-primary" [disabled]="saving()">Start ticket</button>
              <button type="button" class="btn btn-secondary" (click)="cancelStart()">Cancel</button>
            </div>
          </form>
        </div>
      </div>
    }
  
    <!-- Complete modal -->
    @if (completeTarget()) {
      <div class="modal-backdrop" (click)="cancelComplete()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h3>Complete maintenance #{{ completeTarget()?.maintId }}</h3>
          <p class="card-subtitle">Vehicle returns to AVAILABLE after completion.</p>
          <form [formGroup]="completeForm" (ngSubmit)="confirmComplete()">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Cost (₹)</label>
                <input type="number" class="form-control" formControlName="cost" min="0" step="0.01"/>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Mechanic notes</label>
              <textarea class="form-control" rows="3" formControlName="mechanicNotes"
              placeholder="What was actually done"></textarea>
            </div>
            <div style="display:flex; gap:8px;">
              <button type="submit" class="btn btn-success" [disabled]="saving()">Complete ticket</button>
              <button type="button" class="btn btn-secondary" (click)="cancelComplete()">Cancel</button>
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
      width: 100%; max-width: 480px; box-shadow: var(--shadow);
    }
    .modal-card h3 { margin: 0 0 10px; font-size: 18px; }
  `]
})
export class MaintenanceComponent implements OnInit {
  private fb = inject(FormBuilder);
  private svc = inject(FleetService);

  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  records = signal<MaintenanceRecord[]>([]);

  startTarget = signal<MaintenanceRecord | null>(null);
  completeTarget = signal<MaintenanceRecord | null>(null);

  startForm = this.fb.nonNullable.group({
    mechanicName: ['', Validators.required]
  });
  completeForm = this.fb.nonNullable.group({
    cost: [0, [Validators.required, Validators.min(0)]],
    mechanicNotes: ['', Validators.required]
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getAllMaintenance().subscribe({
      next: r => { this.records.set(r); this.loading.set(false); },
      error: e => { this.error.set(this.msg(e)); this.loading.set(false); }
    });
  }

  openStart(m: MaintenanceRecord) { this.startTarget.set(m); this.startForm.reset({ mechanicName: '' }); }
  cancelStart() { this.startTarget.set(null); }
  confirmStart() {
    if (this.startForm.invalid) { this.startForm.markAllAsTouched(); return; }
    const m = this.startTarget(); if (!m) return;
    this.saving.set(true);
    this.svc.startMaintenance(m.maintId, this.startForm.getRawValue().mechanicName).subscribe({
      next: r => { this.saving.set(false); this.success.set(r.message); this.startTarget.set(null); this.load(); },
      error: e => { this.saving.set(false); this.error.set(this.msg(e)); }
    });
  }

  openComplete(m: MaintenanceRecord) { this.completeTarget.set(m); this.completeForm.reset({ cost: 0, mechanicNotes: '' }); }
  cancelComplete() { this.completeTarget.set(null); }
  confirmComplete() {
    if (this.completeForm.invalid) { this.completeForm.markAllAsTouched(); return; }
    const m = this.completeTarget(); if (!m) return;
    this.saving.set(true);
    this.svc.completeMaintenance(m.maintId, this.completeForm.getRawValue()).subscribe({
      next: r => { this.saving.set(false); this.success.set(r.message); this.completeTarget.set(null); this.load(); },
      error: e => { this.saving.set(false); this.error.set(this.msg(e)); }
    });
  }

  badge(s: string): string {
    if (s === 'PENDING') return 'badge-warning';
    if (s === 'IN_PROGRESS') return 'badge-info';
    if (s === 'COMPLETED') return 'badge-success';
    return 'badge-default';
  }

  private msg(e: HttpErrorResponse) { return e.error?.message || e.error?.error || e.message || 'Failed'; }
}
