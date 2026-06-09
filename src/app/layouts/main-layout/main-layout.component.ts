import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';

import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { NotificationService } from '../../core/services/notification.service';
import { ROLE_LABEL, Role } from '../../core/models/role.model';
import { NotificationPanelComponent } from '../notification-panel/notification-panel.component';

interface NavItem {
  label: string;
  path: string;
  icon: string;
  roles: Role[];
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NotificationPanelComponent],
  templateUrl: './main-layout.component.html',
  styleUrls: ['./main-layout.component.css']
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);
  private notif = inject(NotificationService);

  user = this.auth.user;
  roleLabel = computed(() => {
    const r = this.user()?.role;
    return r ? ROLE_LABEL[r] : '';
  });

  panelOpen = signal(false);
  unread = this.notif.unread;

  private pollId?: any;

  navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: '◆',
      roles: ['ADMIN', 'CUSTOMER', 'DISPATCHER', 'FLEET_MANAGER', 'DRIVER', 'AUDITOR'] },

    { label: 'New Shipment', path: '/customer/new', icon: '✚', roles: ['CUSTOMER'] },
    { label: 'My Orders', path: '/customer/orders', icon: '▤', roles: ['CUSTOMER'] },

    { label: 'Shipments', path: '/dispatcher/shipments', icon: '▤', roles: ['DISPATCHER'] },
    { label: 'Routes', path: '/dispatcher/routes', icon: '↯', roles: ['DISPATCHER'] },
    { label: 'Dispatch', path: '/dispatcher/dispatch', icon: '➤', roles: ['DISPATCHER'] },
    { label: 'Assignments', path: '/dispatcher/assignments', icon: '◉', roles: ['DISPATCHER'] },
    { label: 'Schedules', path: '/dispatcher/schedules', icon: '⏲', roles: ['DISPATCHER'] },

    { label: 'Vehicles', path: '/fleet/vehicles', icon: '◭', roles: ['FLEET_MANAGER'] },
    { label: 'Inspections', path: '/fleet/inspections', icon: '⚙', roles: ['FLEET_MANAGER'] },
    { label: 'Maintenance', path: '/fleet/maintenance', icon: '✦', roles: ['FLEET_MANAGER'] },

    { label: 'My Rides', path: '/driver/rides', icon: '⛟', roles: ['DRIVER'] },

    { label: 'Pending Users', path: '/admin/pending', icon: '⏲', roles: ['ADMIN'] },
    { label: 'All Users', path: '/admin/users', icon: '◐', roles: ['ADMIN'] },

    { label: 'Audit Logs', path: '/admin/audit', icon: '✔', roles: ['ADMIN', 'AUDITOR'] },

    { label: 'Notifications', path: '/notifications', icon: '✉',
      roles: ['ADMIN', 'CUSTOMER', 'DISPATCHER', 'FLEET_MANAGER', 'DRIVER', 'AUDITOR'] }
  ];

  visibleNav = computed(() => {
    const r = this.user()?.role;
    if (!r) return [];
    return this.navItems.filter(n => n.roles.includes(r));
  });

  ngOnInit() {
    this.refreshNotifs();
    this.pollId = setInterval(() => this.refreshNotifs(), 60000);
  }
  ngOnDestroy() {
    if (this.pollId) clearInterval(this.pollId);
  }

  private refreshNotifs() {
    this.notif.unreadCount().subscribe({ next: () => {}, error: () => {} });
  }

  toggleNotifs() {
    const next = !this.panelOpen();
    this.panelOpen.set(next);
    if (next) this.refreshNotifs();
  }
  closeNotifs() { this.panelOpen.set(false); }

  logout() { this.auth.logout(); }
}
