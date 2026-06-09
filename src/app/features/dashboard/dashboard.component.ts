import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { Subscription, filter } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ShipmentService } from '../../core/services/shipment.service';
import { FleetService } from '../../core/services/fleet.service';
import { DispatchService } from '../../core/services/dispatch.service';
import { DriverService } from '../../core/services/driver.service';
import { AdminService } from '../../core/services/admin.service';
import { NotificationService } from '../../core/services/notification.service';
import { ROLE_LABEL } from '../../core/models/role.model';
import { DonutChartComponent, DonutSlice } from '../../shared/charts/donut-chart.component';
import { BarChartComponent, BarItem } from '../../shared/charts/bar-chart.component';

const COLOR = {
  primary: '#4f46e5',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#0ea5e9',
  slate: '#64748b',
  violet: '#8b5cf6',
  pink: '#ec4899',
  teal: '#14b8a6'
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, DonutChartComponent, BarChartComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private shipments = inject(ShipmentService);
  private fleet = inject(FleetService);
  private dispatch = inject(DispatchService);
  private driver = inject(DriverService);
  private admin = inject(AdminService);
  private notif = inject(NotificationService);
  private router = inject(Router);

  user = this.auth.user;
  role = this.auth.role;
  error = signal<string | null>(null);
  refreshing = signal(false);
  lastUpdated = signal<Date | null>(null);

  // ADMIN
  totalUsers = signal(0);
  pendingApprovals = signal(0);
  auditLogCount = signal(0);
  usersByRole = signal<DonutSlice[]>([]);
  usersByStatus = signal<DonutSlice[]>([]);
  topAuditActions = signal<BarItem[]>([]);

  // CUSTOMER
  myOrders = signal(0);
  myOrdersInTransit = signal(0);
  myOrdersDelivered = signal(0);
  ordersByStatus = signal<DonutSlice[]>([]);
  ordersByDestination = signal<BarItem[]>([]);

  // DISPATCHER
  shipmentTotal = signal(0);
  shipmentsPending = signal(0);
  shipmentsInTransit = signal(0);
  routesActive = signal(0);
  schedulesActive = signal(0);
  shipmentsByStatus = signal<DonutSlice[]>([]);
  routesByStatus = signal<DonutSlice[]>([]);
  schedulesByStatus = signal<DonutSlice[]>([]);

  // FLEET_MANAGER
  vehicleTotal = signal(0);
  vehiclesAvailable = signal(0);
  vehiclesInMaintenance = signal(0);
  pendingMaintenance = signal(0);
  vehiclesByStatus = signal<DonutSlice[]>([]);
  inspectionsByStatus = signal<DonutSlice[]>([]);
  maintenanceByStatus = signal<DonutSlice[]>([]);
  vehiclesByType = signal<BarItem[]>([]);

  // DRIVER
  ridesScheduled = signal(0);
  ridesInTransit = signal(0);
  ridesByStatus = signal<DonutSlice[]>([]);

  // AUDITOR
  auditTotal = signal(0);
  auditByAction = signal<BarItem[]>([]);

  unreadCount = signal(0);
  private navSub?: Subscription;

  roleLabel = computed(() => {
    const r = this.role();
    return r ? ROLE_LABEL[r] : '';
  });

  ngOnInit() {
    this.load();
    this.navSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        if ((e.urlAfterRedirects || e.url || '').startsWith('/dashboard')) {
          this.load();
        }
      });
  }

  ngOnDestroy() {
    this.navSub?.unsubscribe();
  }

  refresh() { this.load(); }

  load() {
    this.refreshing.set(true);
    this.error.set(null);
    this.notif.unreadCount().subscribe({ next: r => this.unreadCount.set(r.count), error: () => {} });

    const r = this.role();
    if (!r) { this.refreshing.set(false); return; }

    const calls: Promise<void>[] = [];

    switch (r) {
      case 'ADMIN':
        calls.push(this.toPromise(this.admin.getAllUsers(), u => {
          this.totalUsers.set(u.length);
          this.usersByRole.set(this.groupAsSlices(u, x => x.role, [
            COLOR.primary, COLOR.success, COLOR.warning, COLOR.info, COLOR.violet, COLOR.pink, COLOR.slate
          ]));
          this.usersByStatus.set(this.groupAsSlices(u, x => x.status, [
            COLOR.success, COLOR.warning, COLOR.danger
          ]));
        }));
        calls.push(this.toPromise(this.admin.getPending(), u => this.pendingApprovals.set(u.length)));
        calls.push(this.toPromise(this.admin.auditLogs(), a => {
          this.auditLogCount.set(a.length);
          this.topAuditActions.set(this.topBars(a, x => x.action, 6, COLOR.primary));
        }));
        break;

      case 'CUSTOMER':
        calls.push(this.toPromise(this.shipments.myOrders(), list => {
          this.myOrders.set(list.length);
          this.myOrdersInTransit.set(list.filter(s => s.status === 'IN_TRANSIT' || s.status === 'ACCEPTED').length);
          this.myOrdersDelivered.set(list.filter(s => s.status === 'DELIVERED').length);
          this.ordersByStatus.set(this.statusSlices(list, s => s.status, {
            PENDING: COLOR.warning, ACCEPTED: COLOR.info, IN_TRANSIT: COLOR.primary,
            DELIVERED: COLOR.success, CANCELLED: COLOR.slate
          }));
          this.ordersByDestination.set(this.topBars(list, s => s.destination, 5, COLOR.info));
        }, 'Failed to load orders.'));
        break;

      case 'DISPATCHER':
        calls.push(this.toPromise(this.dispatch.getShipments(), s => {
          this.shipmentTotal.set(s.length);
          this.shipmentsPending.set(s.filter(x => x.status === 'PENDING').length);
          this.shipmentsInTransit.set(s.filter(x => x.status === 'IN_TRANSIT' || x.status === 'ACCEPTED').length);
          this.shipmentsByStatus.set(this.statusSlices(s, x => x.status, {
            PENDING: COLOR.warning, ACCEPTED: COLOR.info, IN_TRANSIT: COLOR.primary,
            DELIVERED: COLOR.success, CANCELLED: COLOR.slate
          }));
        }));
        calls.push(this.toPromise(this.dispatch.getRoutes(), rs => {
          this.routesActive.set(rs.filter(x => x.status === 'ACTIVE').length);
          this.routesByStatus.set(this.statusSlices(rs, x => x.status, {
            ACTIVE: COLOR.success, INACTIVE: COLOR.slate
          }));
        }));
        calls.push(this.toPromise(this.dispatch.getAllSchedules(), rs => {
          this.schedulesActive.set(rs.filter(x => x.status === 'SCHEDULED' || x.status === 'IN_TRANSIT').length);
          this.schedulesByStatus.set(this.statusSlices(rs, x => x.status, {
            SCHEDULED: COLOR.info, IN_TRANSIT: COLOR.primary,
            COMPLETED: COLOR.success, CANCELLED: COLOR.slate
          }));
        }));
        break;

      case 'FLEET_MANAGER':
        calls.push(this.toPromise(this.fleet.getVehicles(), v => {
          this.vehicleTotal.set(v.length);
          this.vehiclesAvailable.set(v.filter(x => x.status === 'AVAILABLE').length);
          this.vehiclesInMaintenance.set(v.filter(x => x.status === 'IN_MAINTENANCE').length);
          this.vehiclesByStatus.set(this.statusSlices(v, x => x.status, {
            AVAILABLE: COLOR.success, IN_USE: COLOR.primary,
            IN_MAINTENANCE: COLOR.warning, OUT_OF_SERVICE: COLOR.danger
          }));
          this.vehiclesByType.set(this.topBars(v, x => x.type, 6, COLOR.violet));
        }));
        calls.push(this.toPromise(this.fleet.getAllMaintenance(), m => {
          this.pendingMaintenance.set(m.filter(x => x.status === 'PENDING' || x.status === 'IN_PROGRESS').length);
          this.maintenanceByStatus.set(this.statusSlices(m, x => x.status, {
            PENDING: COLOR.warning, IN_PROGRESS: COLOR.info, COMPLETED: COLOR.success
          }));
        }));
        calls.push(this.toPromise(this.fleet.getAllInspections(), i => {
          this.inspectionsByStatus.set(this.statusSlices(i, x => x.status, {
            PASSED: COLOR.success, FAILED: COLOR.danger
          }));
        }));
        break;

      case 'DRIVER':
        calls.push(this.toPromise(this.driver.myRides(), rs => {
          this.ridesScheduled.set(rs.filter(x => x.status === 'SCHEDULED').length);
          this.ridesInTransit.set(rs.filter(x => x.status === 'IN_TRANSIT').length);
          this.ridesByStatus.set(this.statusSlices(rs, x => x.status, {
            SCHEDULED: COLOR.info, IN_TRANSIT: COLOR.primary,
            COMPLETED: COLOR.success, CANCELLED: COLOR.slate
          }));
        }, 'Failed to load rides.'));
        break;

      case 'AUDITOR':
        calls.push(this.toPromise(this.admin.auditLogs(), a => {
          this.auditTotal.set(a.length);
          this.auditByAction.set(this.topBars(a, x => x.action, 8, COLOR.primary));
        }));
        break;
    }

    Promise.all(calls).finally(() => {
      this.refreshing.set(false);
      this.lastUpdated.set(new Date());
    });
  }

  private toPromise<T>(obs: import('rxjs').Observable<T>, onNext: (v: T) => void, errMsg?: string): Promise<void> {
    return new Promise(resolve => {
      obs.subscribe({
        next: v => { onNext(v); resolve(); },
        error: () => { if (errMsg) this.error.set(errMsg); resolve(); }
      });
    });
  }

  /* ---------- aggregation helpers ---------- */

  private groupAsSlices<T>(list: T[], key: (t: T) => string, palette: string[]): DonutSlice[] {
    const map = new Map<string, number>();
    for (const item of list) {
      const k = key(item) || 'UNKNOWN';
      map.set(k, (map.get(k) || 0) + 1);
    }
    const entries = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    return entries.map(([label, value], i) => ({ label, value, color: palette[i % palette.length] }));
  }

  private statusSlices<T>(list: T[], key: (t: T) => string, palette: Record<string, string>): DonutSlice[] {
    const map = new Map<string, number>();
    for (const item of list) {
      const k = key(item) || 'UNKNOWN';
      map.set(k, (map.get(k) || 0) + 1);
    }
    return Array.from(map.entries()).map(([label, value]) => ({
      label, value, color: palette[label] || COLOR.slate
    }));
  }

  private topBars<T>(list: T[], key: (t: T) => string, top: number, color: string): BarItem[] {
    const map = new Map<string, number>();
    for (const item of list) {
      const k = key(item) || 'UNKNOWN';
      map.set(k, (map.get(k) || 0) + 1);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, top)
      .map(([label, value]) => ({ label, value, color }));
  }
}
