import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { FleetService } from '../../../core/services/fleet.service';
import { Vehicle } from '../../../core/models/vehicle.model';

@Component({
  selector: 'app-vehicles',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Vehicles</h1>
        <p class="page-subtitle">Add, edit, view and remove fleet vehicles.</p>
      </div>
    </div>
  
    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }
    @if (success()) {
      <div class="alert alert-success">{{ success() }}</div>
    }
  
    <div class="card" style="margin-bottom: 20px;">
      <div class="card-header"><h3 class="card-title">Add new vehicle</h3></div>
      <form [formGroup]="form" (ngSubmit)="add()">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Registration number</label>
            <input class="form-control" formControlName="regNumber" placeholder="TN-01-AB-1234"/>
          </div>
          <div class="form-group">
            <label class="form-label">Type</label>
            <select class="form-control" formControlName="type">
              <option value="TRUCK">TRUCK</option>
              <option value="VAN">VAN</option>
              <option value="MINI_TRUCK">MINI_TRUCK</option>
              <option value="CONTAINER">CONTAINER</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Capacity (kg)</label>
          <input type="number" class="form-control" formControlName="capacity" min="1" step="1"/>
        </div>
        <button type="submit" class="btn btn-primary" [disabled]="saving()">
          @if (!saving()) {
            <span>Add vehicle</span>
          }
          @if (saving()) {
            <span class="spinner" style="width:16px;height:16px;border-width:2px;border-top-color:#fff;"></span>
          }
        </button>
      </form>
    </div>
  
    <div class="card">
      <div class="card-header"><h3 class="card-title">All vehicles</h3></div>
      @if (loading()) {
        <div class="spinner-center"><span class="spinner spinner-lg"></span></div>
      }
  
      @if (!loading() && vehicles().length === 0) {
        <div class="empty-state"><h4>No vehicles</h4></div>
      }
  
      @if (!loading() && vehicles().length > 0) {
        <div class="table-wrapper">
          <table class="table">
            <thead><tr><th>#</th><th>Reg #</th><th>Type</th><th>Capacity</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              @for (v of vehicles(); track v) {
                <tr>
                  <td>#{{ v.vehicleId }}</td>
                  <td>{{ v.regNumber }}</td>
                  <td>{{ v.type }}</td>
                  <td>{{ v.capacity }} kg</td>
                  <td><span class="badge" [ngClass]="badge(v.status)">{{ v.status }}</span></td>
                  <td>
                    <button class="btn btn-secondary btn-sm" (click)="openEdit(v)">Edit</button>
                    <button class="btn btn-danger btn-sm" (click)="remove(v)" style="margin-left:6px;">Delete</button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>
  
    <!-- Edit modal -->
    @if (editTarget()) {
      <div class="modal-backdrop" (click)="cancelEdit()">
        <div class="modal-card" (click)="$event.stopPropagation()">
          <h3>Edit vehicle #{{ editTarget()?.vehicleId }}</h3>
          <form [formGroup]="editForm" (ngSubmit)="applyEdit()">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Registration number</label>
                <input class="form-control" formControlName="regNumber"/>
              </div>
              <div class="form-group">
                <label class="form-label">Type</label>
                <select class="form-control" formControlName="type">
                  <option value="TRUCK">TRUCK</option>
                  <option value="VAN">VAN</option>
                  <option value="MINI_TRUCK">MINI_TRUCK</option>
                  <option value="CONTAINER">CONTAINER</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Capacity (kg)</label>
              <input type="number" class="form-control" formControlName="capacity" min="1"/>
            </div>
            <div style="display:flex; gap:8px;">
              <button type="submit" class="btn btn-primary" [disabled]="saving()">Save</button>
              <button type="button" class="btn btn-secondary" (click)="cancelEdit()">Cancel</button>
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
      width: 100%; max-width: 520px; box-shadow: var(--shadow);
    }
    .modal-card h3 { margin: 0 0 14px; font-size: 18px; }
  `]
})
export class VehiclesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private svc = inject(FleetService);

  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  vehicles = signal<Vehicle[]>([]);

  form = this.fb.nonNullable.group({
    regNumber: ['', Validators.required],
    type: ['TRUCK', Validators.required],
    capacity: [1000, [Validators.required, Validators.min(1)]]
  });

  editTarget = signal<Vehicle | null>(null);
  editForm = this.fb.nonNullable.group({
    regNumber: ['', Validators.required],
    type: ['TRUCK', Validators.required],
    capacity: [1000, [Validators.required, Validators.min(1)]]
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getVehicles().subscribe({
      next: v => { this.vehicles.set(v); this.loading.set(false); },
      error: (e: HttpErrorResponse) => { this.error.set(this.msg(e)); this.loading.set(false); }
    });
  }

  add() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true); this.error.set(null); this.success.set(null);
    this.svc.addVehicle(this.form.getRawValue()).subscribe({
      next: v => { this.saving.set(false); this.success.set(`Vehicle #${v.vehicleId} added.`); this.form.reset({ regNumber: '', type: 'TRUCK', capacity: 1000 }); this.load(); },
      error: (e: HttpErrorResponse) => { this.saving.set(false); this.error.set(this.msg(e)); }
    });
  }

  openEdit(v: Vehicle) {
    this.error.set(null); this.success.set(null);
    this.editTarget.set(v);
    this.editForm.reset({ regNumber: v.regNumber, type: v.type, capacity: v.capacity });
  }
  cancelEdit() { this.editTarget.set(null); }
  applyEdit() {
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    const v = this.editTarget(); if (!v) return;
    this.saving.set(true);
    this.svc.updateVehicle(v.vehicleId, this.editForm.getRawValue()).subscribe({
      next: u => { this.saving.set(false); this.success.set(`Vehicle #${u.vehicleId} updated.`); this.editTarget.set(null); this.load(); },
      error: (e: HttpErrorResponse) => { this.saving.set(false); this.error.set(this.msg(e)); }
    });
  }

  remove(v: Vehicle) {
    if (!confirm(`Delete vehicle ${v.regNumber} (#${v.vehicleId})?`)) return;
    this.error.set(null); this.success.set(null);
    this.svc.deleteVehicle(v.vehicleId).subscribe({
      next: r => { this.success.set(r.message); this.load(); },
      error: (e: HttpErrorResponse) => this.error.set(this.msg(e))
    });
  }

  badge(s: string): string {
    if (s === 'AVAILABLE') return 'badge-success';
    if (s === 'IN_USE') return 'badge-info';
    if (s === 'IN_MAINTENANCE') return 'badge-warning';
    return 'badge-default';
  }

  private msg(e: HttpErrorResponse) { return e.error?.message || e.error?.error || e.message || 'Failed'; }
}
