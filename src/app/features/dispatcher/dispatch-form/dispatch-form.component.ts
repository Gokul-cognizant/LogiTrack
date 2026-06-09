import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription, combineLatest, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, switchMap } from 'rxjs/operators';
import { DispatchService } from '../../../core/services/dispatch.service';
import { FleetService } from '../../../core/services/fleet.service';
import { AdminService } from '../../../core/services/admin.service';
import { Vehicle } from '../../../core/models/vehicle.model';
import { Route, DispatchResponse, RouteSchedule } from '../../../core/models/dispatch.model';
import { Shipment } from '../../../core/models/shipment.model';

interface Availability {
  state: 'idle' | 'checking' | 'available' | 'busy' | 'invalid' | 'notfound';
  detail?: string;
}

@Component({
  selector: 'app-dispatch-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Dispatch a shipment</h1>
        <p class="page-subtitle">Pick a shipment, vehicle, route and driver. We check both vehicle and driver availability for your time window.</p>
      </div>
    </div>
  
    @if (error()) {
      <div class="alert alert-error">{{ error() }}</div>
    }
    @if (result()) {
      <div class="alert alert-success">
        <strong>{{ result()?.message }}</strong><br/>
        Schedule #{{ result()?.scheduleId }} · Assignment #{{ result()?.assignId }} · Driver #{{ result()?.driverId }}
      </div>
    }
  
    <div class="card" style="max-width: 760px;">
      <form [formGroup]="form" (ngSubmit)="submit()">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Shipment</label>
            <select class="form-control" formControlName="shipmentId">
              <option [ngValue]="null">— Select a pending shipment —</option>
              @for (s of pendingShipments(); track s) {
                <option [ngValue]="s.shipmentId">
                  #{{ s.shipmentId }} · {{ s.origin }} → {{ s.destination }} ({{ s.weight }}kg)
                </option>
              }
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">
              Vehicle
              @if (vehicleAvail().state !== 'idle') {
                <span class="chip" [ngClass]="chipClass(vehicleAvail().state)">
                  @if (vehicleAvail().state === 'checking') {
                    <span class="dot-spin"></span>
                  }
                  {{ chipText(vehicleAvail()) }}
                </span>
              }
            </label>
            @if (availableVehicles().length > 0) {
              <select class="form-control" formControlName="vehicleId">
                <option [ngValue]="null">— Select a vehicle —</option>
                @for (v of availableVehicles(); track v) {
                  <option [ngValue]="v.vehicleId">
                    #{{ v.vehicleId }} · {{ v.regNumber }} ({{ v.type }}, {{ v.capacity }}kg)
                  </option>
                }
              </select>
            }
            @if (availableVehicles().length === 0) {
              <input type="number" class="form-control"
                formControlName="vehicleId" placeholder="Type vehicle ID (e.g. 1)"/>
            }
            @if (availableVehicles().length === 0) {
              <div class="form-error" style="color: var(--text-muted);">
                Vehicle list unavailable for your role — type the ID manually.
              </div>
            }
            @if ((vehicleAvail().state === 'notfound' || vehicleAvail().state === 'busy') && vehicleAvail().detail) {
              <div class="form-error" style="color: var(--danger);">
                {{ vehicleAvail().detail }}
              </div>
            }
          </div>
        </div>
  
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Route</label>
            <select class="form-control" formControlName="routeId">
              <option [ngValue]="null">— Select a route —</option>
              @for (r of activeRoutes(); track r) {
                <option [ngValue]="r.routeId">
                  #{{ r.routeId }} · {{ r.name }} ({{ r.distanceKm }} km)
                </option>
              }
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">
              Driver ID (user ID)
              @if (driverAvail().state !== 'idle') {
                <span class="chip" [ngClass]="chipClass(driverAvail().state)">
                  @if (driverAvail().state === 'checking') {
                    <span class="dot-spin"></span>
                  }
                  {{ chipText(driverAvail()) }}
                </span>
              }
            </label>
            <input type="number" class="form-control" formControlName="driverId" placeholder="e.g. 4"/>
            @if ((driverAvail().state === 'busy' || driverAvail().state === 'notfound') && driverAvail().detail) {
              <div class="form-error" style="color: var(--danger);">
                {{ driverAvail().detail }}
              </div>
            }
          </div>
        </div>
  
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Departure</label>
            <input type="datetime-local" class="form-control" formControlName="departureAt"/>
          </div>
          <div class="form-group">
            <label class="form-label">Arrival</label>
            <input type="datetime-local" class="form-control" formControlName="arrivalAt"/>
          </div>
        </div>
  
        <button type="submit" class="btn btn-primary" [disabled]="loading() || !canSubmit()">
          @if (!loading()) {
            <span>Dispatch shipment</span>
          }
          @if (loading()) {
            <span class="spinner" style="width:16px;height:16px;border-width:2px;border-top-color:#fff;"></span>
          }
        </button>
        @if (!canSubmit() && !loading()) {
          <span class="hint">
            Resolve the {{ blockReason() }} before dispatching.
          </span>
        }
      </form>
    </div>
  </div>
  `,
  styles: [`
    .chip {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 11px; font-weight: 600; padding: 2px 8px;
      border-radius: 999px; margin-left: 8px; letter-spacing: .02em;
      vertical-align: middle;
    }
    .chip-avail { background: #d1fae5; color: #047857; }
    .chip-busy { background: #fee2e2; color: #b91c1c; }
    .chip-check { background: #e0e7ff; color: #4338ca; }
    .chip-invalid { background: #f1f5f9; color: #64748b; }
    .dot-spin { width: 8px; height: 8px; border-radius: 50%; border: 2px solid currentColor; border-top-color: transparent; animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .hint { font-size: 12px; color: var(--text-muted); margin-left: 12px; }
  `]
})
export class DispatchFormComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private dispatch = inject(DispatchService);
  private fleet = inject(FleetService);
  private admin = inject(AdminService);

  loading = signal(false);
  error = signal<string | null>(null);
  result = signal<DispatchResponse | null>(null);
  pendingShipments = signal<Shipment[]>([]);
  availableVehicles = signal<Vehicle[]>([]);
  activeRoutes = signal<Route[]>([]);

  vehicleAvail = signal<Availability>({ state: 'idle' });
  driverAvail = signal<Availability>({ state: 'idle' });

  form = this.fb.group({
    shipmentId: [null as number | null, Validators.required],
    vehicleId: [null as number | null, Validators.required],
    routeId: [null as number | null, Validators.required],
    driverId: [null as number | null, Validators.required],
    departureAt: ['', Validators.required],
    arrivalAt: ['', Validators.required]
  });

  canSubmit = computed(() => {
    const v = this.vehicleAvail().state;
    const d = this.driverAvail().state;
    const bad = (s: Availability['state']) => s === 'busy' || s === 'checking' || s === 'notfound' || s === 'invalid';
    return !bad(v) && !bad(d);
  });

  blockReason = computed(() => {
    const v = this.vehicleAvail().state;
    const d = this.driverAvail().state;
    if (v === 'notfound' && d === 'notfound') return 'vehicle and driver lookup';
    if (v === 'notfound') return 'vehicle lookup';
    if (d === 'notfound') return 'driver lookup';
    if (v === 'busy' && d === 'busy') return 'vehicle and driver conflicts';
    if (v === 'busy') return 'vehicle conflict';
    if (d === 'busy') return 'driver conflict';
    if (v === 'checking' || d === 'checking') return 'availability check';
    return '';
  });

  private subs: Subscription[] = [];

  ngOnInit() {
    this.dispatch.getShipments().subscribe({
      next: s => this.pendingShipments.set(s.filter(x => x.status === 'PENDING'))
    });
    this.fleet.getVehicles().subscribe({
      next: v => this.availableVehicles.set(v.filter(x => x.status === 'AVAILABLE')),
      error: () => this.availableVehicles.set([])
    });
    this.dispatch.getRoutes().subscribe({
      next: r => this.activeRoutes.set(r.filter(x => x.status === 'ACTIVE'))
    });

    /* Vehicle availability — uses backend endpoint */
    const v$ = combineLatest([
      this.form.controls.vehicleId.valueChanges,
      this.form.controls.departureAt.valueChanges,
      this.form.controls.arrivalAt.valueChanges
    ]).pipe(
      debounceTime(350),
      map(([vid, start, end]) => ({ vid, start, end })),
      distinctUntilChanged((a, b) => a.vid === b.vid && a.start === b.start && a.end === b.end),
      switchMap(({ vid, start, end }) => {
        if (!vid || !start || !end) { this.vehicleAvail.set({ state: 'idle' }); return of(null); }
        if (new Date(end) <= new Date(start)) {
          this.vehicleAvail.set({ state: 'invalid', detail: 'End must be after start.' });
          return of(null);
        }
        this.vehicleAvail.set({ state: 'checking' });
        return this.dispatch.checkAvailability(vid, start, end).pipe(
          map(res => ({ kind: 'ok' as const, res })),
          catchError((err: HttpErrorResponse) => {
            if (err.status === 404) {
              return of({ kind: 'notfound' as const, message: err.error?.message || `Vehicle not found with id ${vid}` });
            }
            return of({ kind: 'error' as const, message: err.error?.message || err.message || 'Could not check vehicle availability.' });
          })
        );
      })
    ).subscribe(out => {
      if (!out) return;
      if (out.kind === 'notfound') {
        this.vehicleAvail.set({ state: 'notfound', detail: out.message });
        return;
      }
      if (out.kind === 'error') {
        this.vehicleAvail.set({ state: 'invalid', detail: out.message });
        return;
      }
      const res = out.res;
      this.vehicleAvail.set(res.available
        ? { state: 'available', detail: 'No overlapping schedule.' }
        : { state: 'busy', detail: res.message || 'Vehicle already booked in this window.' });
    });

    /* Driver availability — first verify the user exists & is a DRIVER, then check schedule */
    const d$ = combineLatest([
      this.form.controls.driverId.valueChanges,
      this.form.controls.departureAt.valueChanges,
      this.form.controls.arrivalAt.valueChanges
    ]).pipe(
      debounceTime(350),
      map(([did, start, end]) => ({ did, start, end })),
      distinctUntilChanged((a, b) => a.did === b.did && a.start === b.start && a.end === b.end),
      switchMap(({ did, start, end }) => {
        if (!did || !start || !end) { this.driverAvail.set({ state: 'idle' }); return of(null); }
        if (new Date(end) <= new Date(start)) {
          this.driverAvail.set({ state: 'invalid', detail: 'End must be after start.' });
          return of(null);
        }
        this.driverAvail.set({ state: 'checking' });
        return this.admin.lookupUser(did).pipe(
          switchMap(user => {
            if (user.role !== 'DRIVER') {
              this.driverAvail.set({
                state: 'notfound',
                detail: `User #${did} is registered as ${user.role}, not a driver.`
              });
              return of(null);
            }
            if (user.status !== 'ACTIVE') {
              this.driverAvail.set({
                state: 'notfound',
                detail: `Driver #${did} (${user.name}) is ${user.status} — cannot be dispatched.`
              });
              return of(null);
            }
            return this.dispatch.getSchedulesByDriver(did).pipe(
              map(scheds => ({ conflict: this.findDriverConflict(scheds, start, end), name: user.name })),
              catchError(() => of({ conflict: null, name: user.name }))
            );
          }),
          catchError((err: HttpErrorResponse) => {
            if (err.status === 404) {
              this.driverAvail.set({ state: 'notfound', detail: `Driver not found with id ${did}.` });
            } else {
              this.driverAvail.set({
                state: 'invalid',
                detail: err.error?.message || err.message || 'Could not verify driver.'
              });
            }
            return of(null);
          })
        );
      })
    ).subscribe(result => {
      if (!result) return;
      const { conflict, name } = result;
      if (!conflict) {
        this.driverAvail.set({ state: 'available', detail: `Driver ${name} has no overlapping schedule.` });
      } else {
        const d = new Date(conflict.departureAt).toLocaleString();
        const a = new Date(conflict.arrivalAt).toLocaleString();
        this.driverAvail.set({
          state: 'busy',
          detail: `Driver already on schedule #${conflict.scheduleId} (shipment #${conflict.shipmentId}) from ${d} to ${a}.`
        });
      }
    });

    this.subs.push(v$, d$);
  }

  ngOnDestroy() { this.subs.forEach(s => s.unsubscribe()); }

  private findDriverConflict(scheds: RouteSchedule[] | null, start: string, end: string): RouteSchedule | null {
    if (!scheds || scheds.length === 0) return null;
    const s0 = new Date(start).getTime();
    const e0 = new Date(end).getTime();
    for (const sc of scheds) {
      if (sc.status !== 'SCHEDULED' && sc.status !== 'IN_TRANSIT') continue;
      const s1 = new Date(sc.departureAt).getTime();
      const e1 = new Date(sc.arrivalAt).getTime();
      if (s0 < e1 && s1 < e0) return sc; // overlap
    }
    return null;
  }

  chipClass(state: Availability['state']): string {
    switch (state) {
      case 'available': return 'chip-avail';
      case 'busy': return 'chip-busy';
      case 'notfound': return 'chip-busy';
      case 'checking': return 'chip-check';
      default: return 'chip-invalid';
    }
  }
  chipText(a: Availability): string {
    switch (a.state) {
      case 'available': return 'Available';
      case 'busy': return 'Busy';
      case 'notfound': return 'Not found';
      case 'checking': return 'Checking…';
      case 'invalid': return 'Pick valid range';
      default: return '';
    }
  }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (!this.canSubmit()) {
      this.error.set('Cannot dispatch: ' + (this.blockReason() || 'conflict detected.'));
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.result.set(null);
    const raw = this.form.getRawValue();
    this.dispatch.processDispatch({
      shipmentId: raw.shipmentId!,
      vehicleId: raw.vehicleId!,
      routeId: raw.routeId!,
      driverId: raw.driverId!,
      departureAt: raw.departureAt!,
      arrivalAt: raw.arrivalAt!
    }).subscribe({
      next: r => {
        this.loading.set(false);
        this.result.set(r);
        this.form.reset();
        this.vehicleAvail.set({ state: 'idle' });
        this.driverAvail.set({ state: 'idle' });
      },
      error: (e: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(e.error?.message || e.error?.error || e.message || 'Dispatch failed.');
      }
    });
  }
}
