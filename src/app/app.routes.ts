import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },

  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'forgot-password',
    loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'forgot-username',
    loadComponent: () => import('./features/auth/forgot-username/forgot-username.component').then(m => m.ForgotUsernameComponent)
  },

  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },

      // Customer-only
      {
        path: 'customer/new',
        canActivate: [roleGuard('CUSTOMER')],
        loadComponent: () => import('./features/customer/create-shipment/create-shipment.component').then(m => m.CreateShipmentComponent)
      },
      {
        path: 'customer/orders',
        canActivate: [roleGuard('CUSTOMER')],
        loadComponent: () => import('./features/customer/my-orders/my-orders.component').then(m => m.MyOrdersComponent)
      },

      // Dispatcher-only (operational role — ADMIN does NOT operate dispatch)
      {
        path: 'dispatcher/shipments',
        canActivate: [roleGuard('DISPATCHER')],
        loadComponent: () => import('./features/dispatcher/shipments-list/shipments-list.component').then(m => m.ShipmentsListComponent)
      },
      {
        path: 'dispatcher/routes',
        canActivate: [roleGuard('DISPATCHER')],
        loadComponent: () => import('./features/dispatcher/routes/routes.component').then(m => m.RoutesComponent)
      },
      {
        path: 'dispatcher/dispatch',
        canActivate: [roleGuard('DISPATCHER')],
        loadComponent: () => import('./features/dispatcher/dispatch-form/dispatch-form.component').then(m => m.DispatchFormComponent)
      },
      {
        path: 'dispatcher/assignments',
        canActivate: [roleGuard('DISPATCHER')],
        loadComponent: () => import('./features/dispatcher/assignments/assignments.component').then(m => m.AssignmentsComponent)
      },
      {
        path: 'dispatcher/schedules',
        canActivate: [roleGuard('DISPATCHER')],
        loadComponent: () => import('./features/dispatcher/schedules/schedules.component').then(m => m.SchedulesComponent)
      },

      // Fleet-only (FLEET_MANAGER only — ADMIN does NOT operate the fleet)
      {
        path: 'fleet/vehicles',
        canActivate: [roleGuard('FLEET_MANAGER')],
        loadComponent: () => import('./features/fleet/vehicles/vehicles.component').then(m => m.VehiclesComponent)
      },
      {
        path: 'fleet/inspections',
        canActivate: [roleGuard('FLEET_MANAGER')],
        loadComponent: () => import('./features/fleet/inspections/inspections.component').then(m => m.InspectionsComponent)
      },
      {
        path: 'fleet/maintenance',
        canActivate: [roleGuard('FLEET_MANAGER')],
        loadComponent: () => import('./features/fleet/maintenance/maintenance.component').then(m => m.MaintenanceComponent)
      },

      // Driver
      {
        path: 'driver/rides',
        canActivate: [roleGuard('DRIVER')],
        loadComponent: () => import('./features/driver/my-rides/my-rides.component').then(m => m.MyRidesComponent)
      },
      {
        path: 'driver/complete/:id',
        canActivate: [roleGuard('DRIVER')],
        loadComponent: () => import('./features/driver/complete-delivery/complete-delivery.component').then(m => m.CompleteDeliveryComponent)
      },

      // Admin (system administration only)
      {
        path: 'admin/pending',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () => import('./features/admin/pending-users/pending-users.component').then(m => m.PendingUsersComponent)
      },
      {
        path: 'admin/users',
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () => import('./features/admin/all-users/all-users.component').then(m => m.AllUsersComponent)
      },
      {
        path: 'admin/audit',
        canActivate: [roleGuard('ADMIN', 'AUDITOR')],
        loadComponent: () => import('./features/admin/audit-logs/audit-logs.component').then(m => m.AuditLogsComponent)
      },

      // Notifications — every authenticated user
      {
        path: 'notifications',
        loadComponent: () => import('./features/notifications/notifications.component').then(m => m.NotificationsComponent)
      }
    ]
  },

  {
    path: '**',
    loadComponent: () => import('./features/shared/not-found/not-found.component').then(m => m.NotFoundComponent)
  }
];
