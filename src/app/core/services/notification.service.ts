import { Injectable, inject, signal } from '@angular/core';
import { Observable, forkJoin, of, BehaviorSubject } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ShipmentService } from './shipment.service';
import { FleetService } from './fleet.service';
import { DispatchService } from './dispatch.service';
import { DriverService } from './driver.service';
import { AdminService } from './admin.service';
import { Notification, NotificationRequest } from '../models/notification.model';

const READ_KEY = 'logitrack.notif.read';
const DISMISS_KEY = 'logitrack.notif.dismissed';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private auth = inject(AuthService);
  private shipments = inject(ShipmentService);
  private fleet = inject(FleetService);
  private dispatch = inject(DispatchService);
  private driver = inject(DriverService);
  private admin = inject(AdminService);

  private cache$ = new BehaviorSubject<Notification[]>([]);
  notifications = signal<Notification[]>([]);
  unread = signal<number>(0);

  my(): Observable<Notification[]> {
    return this.build();
  }

  unreadList(): Observable<Notification[]> {
    return this.build().pipe(map(list => list.filter(n => n.status === 'UNREAD')));
  }

  unreadCount(): Observable<{ count: number }> {
    return this.build().pipe(map(list => ({ count: list.filter(n => n.status === 'UNREAD').length })));
  }

  markRead(id: number): Observable<Notification> {
    const read = this.readIds();
    read.add(id);
    this.persistReadIds(read);
    const updated = this.cache$.value.map(n =>
      n.notificationId === id ? { ...n, status: 'READ' as const } : n
    );
    this.cache$.next(updated);
    this.notifications.set(updated);
    this.unread.set(updated.filter(n => n.status === 'UNREAD').length);
    const found = updated.find(n => n.notificationId === id);
    return of(found!);
  }

  markAllRead(): void {
    const ids = this.cache$.value.map(n => n.notificationId);
    const read = this.readIds();
    ids.forEach(id => read.add(id));
    this.persistReadIds(read);
    const updated = this.cache$.value.map(n => ({ ...n, status: 'READ' as const }));
    this.cache$.next(updated);
    this.notifications.set(updated);
    this.unread.set(0);
  }

  dismiss(id: number): void {
    const dismissed = this.dismissedIds();
    dismissed.add(id);
    this.persistDismissed(dismissed);
    const updated = this.cache$.value.filter(n => n.notificationId !== id);
    this.cache$.next(updated);
    this.notifications.set(updated);
    this.unread.set(updated.filter(n => n.status === 'UNREAD').length);
  }

  /* No-op in local mode — kept for backward compatibility with any callers */
  create(_req: NotificationRequest): Observable<Notification> {
    return of({
      notificationId: Date.now(),
      userEmail: this.auth.user()?.email || '',
      message: _req.message,
      category: _req.category,
      status: 'UNREAD',
      createdAt: new Date().toISOString()
    });
  }
  all(): Observable<Notification[]> { return this.build(); }

  /* ---------- internal: derive notifications from live service data ---------- */

  private build(): Observable<Notification[]> {
    const role = this.auth.role();
    const email = this.auth.user()?.email || '';
    if (!role) {
      this.cache$.next([]);
      this.notifications.set([]);
      this.unread.set(0);
      return of([]);
    }

    const dismissed = this.dismissedIds();
    const read = this.readIds();

    const sources: Observable<Notification[]>[] = [];

    if (role === 'ADMIN') {
      sources.push(
        this.admin.getPending().pipe(
          map(users => users.map(u => this.notif(
            this.idFor('user-pending', u.userId),
            email,
            u.userId,
            `Pending approval: ${u.name || u.email} (${u.role})`,
            'USER_APPROVAL',
            u.createdAt
          ))),
          catchError(() => of([]))
        )
      );
    }

    if (role === 'CUSTOMER') {
      sources.push(
        this.shipments.myOrders().pipe(
          map(list => list.flatMap(s => {
            const out: Notification[] = [];
            if (s.status === 'ACCEPTED' || s.status === 'IN_TRANSIT') {
              out.push(this.notif(
                this.idFor('ship-transit', s.shipmentId),
                email, s.shipmentId,
                `Your shipment #${s.shipmentId} to ${s.destination} is ${s.status === 'IN_TRANSIT' ? 'in transit' : 'accepted'}.`,
                'SHIPMENT', s.orderDate
              ));
            }
            if (s.status === 'DELIVERED') {
              out.push(this.notif(
                this.idFor('ship-delivered', s.shipmentId),
                email, s.shipmentId,
                `Your shipment #${s.shipmentId} to ${s.destination} was delivered.`,
                'DELIVERY', s.orderDate
              ));
            }
            if (s.status === 'CANCELLED') {
              out.push(this.notif(
                this.idFor('ship-cancelled', s.shipmentId),
                email, s.shipmentId,
                `Your shipment #${s.shipmentId} was cancelled.`,
                'SHIPMENT', s.orderDate
              ));
            }
            return out;
          })),
          catchError(() => of([]))
        )
      );
    }

    if (role === 'DISPATCHER') {
      sources.push(
        this.dispatch.getShipments().pipe(
          map(list => list.filter(s => s.status === 'PENDING').map(s => this.notif(
            this.idFor('disp-pending', s.shipmentId),
            email, s.shipmentId,
            `Pending shipment #${s.shipmentId}: ${s.origin} → ${s.destination}`,
            'SHIPMENT', s.orderDate
          ))),
          catchError(() => of([]))
        ),
        this.dispatch.getAllSchedules().pipe(
          map(list => list.filter(x => x.status === 'IN_TRANSIT').map(x => this.notif(
            this.idFor('sched-transit', x.scheduleId),
            email, x.scheduleId,
            `Schedule #${x.scheduleId} is in transit (arrival ${new Date(x.arrivalAt).toLocaleString()})`,
            'SCHEDULE', x.departureAt
          ))),
          catchError(() => of([]))
        )
      );
    }

    if (role === 'FLEET_MANAGER') {
      sources.push(
        this.fleet.getAllMaintenance().pipe(
          map(list => list.filter(m => m.status === 'PENDING' || m.status === 'IN_PROGRESS').map(m => this.notif(
            this.idFor('maint-open', m.maintId),
            email, m.maintId,
            `Maintenance ticket #${m.maintId} on vehicle ${m.vehicleId} is ${m.status}.`,
            'MAINTENANCE', m.performedAt
          ))),
          catchError(() => of([]))
        ),
        this.fleet.getAllInspections().pipe(
          map(list => list.filter(i => i.status === 'FAILED').map(i => this.notif(
            this.idFor('insp-failed', i.inspectionId),
            email, i.inspectionId,
            `Inspection #${i.inspectionId} on vehicle ${i.vehicleId} FAILED — rating ${i.conditionRating}.`,
            'INSPECTION', i.performedAt
          ))),
          catchError(() => of([]))
        ),
        this.fleet.getVehicles().pipe(
          map(list => list.filter(v => v.status === 'IN_MAINTENANCE').map(v => this.notif(
            this.idFor('veh-maint', v.vehicleId),
            email, v.vehicleId,
            `Vehicle ${v.regNumber} is locked in maintenance.`,
            'VEHICLE'
          ))),
          catchError(() => of([]))
        )
      );
    }

    if (role === 'DRIVER') {
      sources.push(
        this.driver.myRides().pipe(
          map(list => list.flatMap(r => {
            const out: Notification[] = [];
            if (r.status === 'SCHEDULED') {
              out.push(this.notif(
                this.idFor('ride-scheduled', r.scheduleId),
                email, r.scheduleId,
                `Upcoming ride #${r.scheduleId}: ${r.origin} → ${r.destination} at ${new Date(r.departureAt).toLocaleString()}`,
                'RIDE', r.departureAt
              ));
            }
            if (r.status === 'IN_TRANSIT') {
              out.push(this.notif(
                this.idFor('ride-transit', r.scheduleId),
                email, r.scheduleId,
                `Ride #${r.scheduleId} in transit — destination ${r.destination}.`,
                'RIDE', r.departureAt
              ));
            }
            return out;
          })),
          catchError(() => of([]))
        )
      );
    }

    if (role === 'AUDITOR') {
      sources.push(
        this.admin.auditLogs().pipe(
          map(list => list.slice(0, 10).map(a => this.notif(
            this.idFor('audit', a.auditId),
            email, a.auditId,
            `${a.action}: ${a.details}`,
            'AUDIT', a.timestamp
          ))),
          catchError(() => of([]))
        )
      );
    }

    if (sources.length === 0) {
      this.cache$.next([]);
      this.notifications.set([]);
      this.unread.set(0);
      return of([]);
    }

    return forkJoin(sources).pipe(
      map(buckets => {
        const merged = ([] as Notification[]).concat(...buckets)
          .filter(n => !dismissed.has(n.notificationId))
          .map(n => ({ ...n, status: read.has(n.notificationId) ? ('READ' as const) : ('UNREAD' as const) }))
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        return merged;
      }),
      tap(list => {
        this.cache$.next(list);
        this.notifications.set(list);
        this.unread.set(list.filter(n => n.status === 'UNREAD').length);
      })
    );
  }

  private notif(
    id: number, email: string, entityId: number | undefined,
    message: string, category: string, createdAt?: string
  ): Notification {
    return {
      notificationId: id,
      userEmail: email,
      entityId,
      message,
      category,
      status: 'UNREAD',
      createdAt: createdAt || new Date().toISOString()
    };
  }

  /* Deterministic id per (kind, entityId) so read/dismiss state survives reload. */
  private idFor(kind: string, entityId: number): number {
    const s = `${kind}:${entityId}`;
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h) + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  private readIds(): Set<number> {
    try {
      const raw = localStorage.getItem(this.keyFor(READ_KEY));
      return new Set(raw ? JSON.parse(raw) as number[] : []);
    } catch { return new Set(); }
  }
  private persistReadIds(s: Set<number>): void {
    localStorage.setItem(this.keyFor(READ_KEY), JSON.stringify(Array.from(s)));
  }
  private dismissedIds(): Set<number> {
    try {
      const raw = localStorage.getItem(this.keyFor(DISMISS_KEY));
      return new Set(raw ? JSON.parse(raw) as number[] : []);
    } catch { return new Set(); }
  }
  private persistDismissed(s: Set<number>): void {
    localStorage.setItem(this.keyFor(DISMISS_KEY), JSON.stringify(Array.from(s)));
  }
  private keyFor(base: string): string {
    const email = this.auth.user()?.email || 'anon';
    return `${base}::${email}`;
  }
}
