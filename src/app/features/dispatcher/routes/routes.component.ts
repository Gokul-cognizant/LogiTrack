import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { DispatchService } from '../../../core/services/dispatch.service';
import { Route } from '../../../core/models/dispatch.model';

@Component({
  selector: 'app-routes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Routes</h1>
        <p class="page-subtitle">Define and manage logistic routes.</p>
      </div>
    </div>
  
    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }
    @if (success()) {
      <div class="alert alert-success">{{ success() }}</div>
    }
  
    <div class="card" style="margin-bottom: 20px;">
      <div class="card-header">
        <h3 class="card-title">Create new route</h3>
      </div>
      <form [formGroup]="form" (ngSubmit)="create()">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Name</label>
            <input class="form-control" formControlName="name" placeholder="Chennai-Bangalore Express"/>
          </div>
          <div class="form-group">
            <label class="form-label">Distance (km)</label>
            <input type="number" class="form-control" formControlName="distanceKm" min="0" step="0.1"/>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Stops (JSON array)</label>
          <input class="form-control" formControlName="stopsJson" placeholder='["Chennai","Krishnagiri","Bangalore"]'/>
        </div>
        <button type="submit" class="btn btn-primary" [disabled]="saving()">
          @if (!saving()) {
            <span>Create route</span>
          }
          @if (saving()) {
            <span class="spinner" style="width:16px;height:16px;border-width:2px;border-top-color:#fff;"></span>
          }
        </button>
      </form>
    </div>
  
    <div class="card">
      <div class="card-header">
        <h3 class="card-title">All routes</h3>
      </div>
      @if (loading()) {
        <div class="spinner-center"><span class="spinner spinner-lg"></span></div>
      }
  
      @if (!loading() && routes().length === 0) {
        <div class="empty-state">
          <h4>No routes</h4>
        </div>
      }
  
      @if (!loading() && routes().length > 0) {
        <div class="table-wrapper">
          <table class="table">
            <thead><tr><th>#</th><th>Name</th><th>Stops</th><th>Distance</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              @for (r of routes(); track r) {
                <tr>
                  <td>#{{ r.routeId }}</td>
                  <td>{{ r.name }}</td>
                  <td><small style="color:var(--text-muted)">{{ r.stopsJson }}</small></td>
                  <td>{{ r.distanceKm }} km</td>
                  <td><span class="badge" [ngClass]="r.status === 'ACTIVE' ? 'badge-success' : 'badge-default'">{{ r.status }}</span></td>
                  <td>
                    <button class="btn btn-secondary btn-sm" (click)="toggle(r)">
                      {{ r.status === 'ACTIVE' ? 'Deactivate' : 'Activate' }}
                    </button>
                    <button class="btn btn-danger btn-sm" (click)="remove(r.routeId)" style="margin-left:6px;">Delete</button>
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
export class RoutesComponent implements OnInit {
  private fb = inject(FormBuilder);
  private svc = inject(DispatchService);

  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  routes = signal<Route[]>([]);


  form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    stopsJson: ['["Origin","Destination"]', Validators.required],
    distanceKm: [0, [Validators.required, Validators.min(0)]],
    status: ['ACTIVE' as 'ACTIVE' | 'INACTIVE']
  });


  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getRoutes().subscribe({
      next: r => { this.routes.set(r); this.loading.set(false); },
      error: e => { this.error.set(this.msg(e)); this.loading.set(false); }
    });
  }

  create() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);
    this.svc.createRoute(this.form.getRawValue()as Partial<Route>).subscribe({
      next: r => { this.saving.set(false); this.success.set(`Route #${r.routeId} created.`); this.form.reset({ stopsJson: '["Origin","Destination"]', status: 'ACTIVE', distanceKm: 0, name: '' }); this.load(); },
      error: e => { this.saving.set(false); this.error.set(this.msg(e)); }
    });
  }

  toggle(r: Route) {
    const newStatus = r.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    this.svc.updateRouteStatus(r.routeId, newStatus).subscribe({
      next: () => this.load(),
      error: e => this.error.set(this.msg(e))
    });
  }

  remove(id: number) {
    if (!confirm(`Delete route #${id}?`)) return;
    this.svc.deleteRoute(id).subscribe({
      next: () => this.load(),
      error: e => this.error.set(this.msg(e))
    });
  }

  private msg(e: HttpErrorResponse) { return e.error?.message || e.error?.error || e.message || 'Failed'; }
}
