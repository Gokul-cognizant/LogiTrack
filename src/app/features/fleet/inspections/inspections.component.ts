import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { FleetService } from '../../../core/services/fleet.service';
import {
  InspectionRecord, InspectionStatus, Vehicle
} from '../../../core/models/vehicle.model';

@Component({
  selector: 'app-inspections',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Vehicle Inspections</h1>
        <p class="page-subtitle">Record inspection results. A FAILED inspection auto-creates a maintenance ticket and locks the vehicle.</p>
      </div>
    </div>
  
    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }
    @if (success()) {
      <div class="alert alert-success">{{ success() }}</div>
    }
  
    <div class="card" style="margin-bottom: 20px;">
      <div class="card-header"><h3 class="card-title">Record a new inspection</h3></div>
      <form [formGroup]="form" (ngSubmit)="record()">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Vehicle</label>
            @if (vehicles().length > 0) {
              <select class="form-control" formControlName="vehicleId">
                <option [ngValue]="null">— Select —</option>
                @for (v of vehicles(); track v) {
                  <option [ngValue]="v.vehicleId">
                    #{{ v.vehicleId }} · {{ v.regNumber }} ({{ v.status }})
                  </option>
                }
              </select>
            }
            @if (vehicles().length === 0) {
              <input type="number" class="form-control"
                formControlName="vehicleId" placeholder="Type vehicle ID"/>
            }
          </div>
          <div class="form-group">
            <label class="form-label">Condition rating (1-5)</label>
            <input type="number" class="form-control" formControlName="conditionRating" min="1" max="5"/>
          </div>
        </div>
  
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Result</label>
            <select class="form-control" formControlName="status">
              <option value="PASSED">PASSED</option>
              <option value="FAILED">FAILED (auto-creates maintenance ticket)</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Photo URI (optional)</label>
            <input class="form-control" formControlName="photoUri" placeholder="inspection.png"/>
          </div>
        </div>
  
        <div class="form-group">
          <label class="form-label">Findings</label>
          <textarea class="form-control" rows="3" formControlName="findings"
          placeholder="Brake pad worn, oil leak detected, etc."></textarea>
        </div>
  
        <button type="submit" class="btn btn-primary" [disabled]="saving()">
          @if (!saving()) {
            <span>Record inspection</span>
          }
          @if (saving()) {
            <span class="spinner" style="width:16px;height:16px;border-width:2px;border-top-color:#fff;"></span>
          }
        </button>
      </form>
    </div>
  
    <div class="card">
      <div class="card-header"><h3 class="card-title">All inspections</h3></div>
      @if (loading()) {
        <div class="spinner-center"><span class="spinner spinner-lg"></span></div>
      }
  
      @if (!loading() && inspections().length === 0) {
        <div class="empty-state"><h4>No inspections recorded</h4></div>
      }
  
      @if (!loading() && inspections().length > 0) {
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr><th>#</th><th>Vehicle</th><th>Rating</th><th>Status</th><th>Findings</th><th>Performed</th></tr>
            </thead>
            <tbody>
              @for (i of inspections(); track i) {
                <tr>
                  <td>#{{ i.inspectionId }}</td>
                  <td>#{{ i.vehicleId }}</td>
                  <td>{{ i.conditionRating }} / 5</td>
                  <td><span class="badge" [ngClass]="i.status === 'PASSED' ? 'badge-success' : 'badge-danger'">{{ i.status }}</span></td>
                  <td><small>{{ i.findings }}</small></td>
                  <td>{{ i.performedAt | date:'medium' }}</td>
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
export class InspectionsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private svc = inject(FleetService);

  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  vehicles = signal<Vehicle[]>([]);
  inspections = signal<InspectionRecord[]>([]);

  form = this.fb.group({
    vehicleId: [null as number | null, Validators.required],
    conditionRating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    status: ['PASSED' as InspectionStatus, Validators.required],
    findings: ['', Validators.required],
    photoUri: ['']
  });

  ngOnInit() {
    this.svc.getVehicles().subscribe({ next: v => this.vehicles.set(v), error: () => this.vehicles.set([]) });
    this.load();
  }

  load() {
    this.loading.set(true);
    this.svc.getAllInspections().subscribe({
      next: r => { this.inspections.set(r); this.loading.set(false); },
      error: (e: HttpErrorResponse) => { this.error.set(this.msg(e)); this.loading.set(false); }
    });
  }

  record() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);
    const raw = this.form.getRawValue();
    this.svc.recordInspection({
      vehicleId: raw.vehicleId!,
      conditionRating: raw.conditionRating!,
      status: raw.status!,
      findings: raw.findings!,
      photoUri: raw.photoUri || undefined
    }).subscribe({
      next: r => { this.saving.set(false); this.success.set(r.message); this.form.reset({ status: 'PASSED', conditionRating: 5 }); this.load(); },
      error: e => { this.saving.set(false); this.error.set(this.msg(e)); }
    });
  }

  private msg(e: HttpErrorResponse) { return e.error?.message || e.error?.error || e.message || 'Failed'; }
}
