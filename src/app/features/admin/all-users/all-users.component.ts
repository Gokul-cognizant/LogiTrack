import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { AdminService } from '../../../core/services/admin.service';
import { User } from '../../../core/models/user.model';
import { Role } from '../../../core/models/role.model';

@Component({
  selector: 'app-all-users',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './all-users.component.html',
  styleUrls: ['./all-users.component.css']
})
export class AllUsersComponent implements OnInit {
  private fb = inject(FormBuilder);
  private svc = inject(AdminService);

  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);
  users = signal<User[]>([]);

  roleTarget = signal<User | null>(null);
  selectableRoles: Role[] = ['CUSTOMER', 'DRIVER', 'DISPATCHER', 'FLEET_MANAGER', 'AUDITOR'];

  allRoles: Role[] = ['ADMIN', 'CUSTOMER', 'DRIVER', 'DISPATCHER', 'FLEET_MANAGER', 'AUDITOR'];
  filterRole = signal<Role | ''>('');

  roleForm = this.fb.nonNullable.group({
    newRole: ['CUSTOMER' as Role, Validators.required],
    licenseNumber: [''],
    contactInfo: ['']
  });

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    const role = this.filterRole();
    const obs = role ? this.svc.getByRole(role as Role) : this.svc.getAllUsers();
    obs.subscribe({
      next: r => { this.users.set(r); this.loading.set(false); },
      error: (e: HttpErrorResponse) => { this.error.set(this.msg(e)); this.loading.set(false); }
    });
  }

  onFilter(ev: Event) {
    const value = (ev.target as HTMLSelectElement).value;
    this.filterRole.set(value as Role | '');
    this.load();
  }

  openRole(u: User) {
    this.error.set(null); this.success.set(null);
    this.roleTarget.set(u);
    this.roleForm.reset({ newRole: 'CUSTOMER' as Role, licenseNumber: '', contactInfo: u.phoneNumber || '' });
  }

  cancelRole() { this.roleTarget.set(null); }

  confirmRole() {
    if (this.roleForm.invalid) { this.roleForm.markAllAsTouched(); return; }
    const u = this.roleTarget(); if (!u) return;

    this.saving.set(true);
    const v = this.roleForm.getRawValue();

    this.svc.updateRole(u.userId, {
      newRole: v.newRole,
      licenseNumber: v.licenseNumber || undefined,
      contactInfo: v.contactInfo || undefined
    }).subscribe({
      next: r => { this.saving.set(false); this.success.set(r.message); this.roleTarget.set(null); this.load(); },
      error: (e: HttpErrorResponse) => { this.saving.set(false); this.error.set(this.msg(e)); }
    });
  }

  deactivate(u: User) {
    if (!confirm(`Deactivate ${u.email}? Their role will be reset to CUSTOMER and they won't be able to log in.`)) return;
    this.error.set(null); this.success.set(null);

    this.svc.deactivate(u.userId).subscribe({
      next: r => { this.success.set(r.message); this.load(); },
      error: (e: HttpErrorResponse) => this.error.set(this.msg(e))
    });
  }

  reactivate(u: User) {
    if (!confirm(`Reactivate ${u.email}?`)) return;
    this.error.set(null); this.success.set(null);

    this.svc.reactivate(u.userId).subscribe({
      next: r => { this.success.set(r.message); this.load(); },
      error: (e: HttpErrorResponse) => this.error.set(this.msg(e))
    });
  }

  badge(s: string) {
    return s === 'ACTIVE' ? 'badge-success'
         : s === 'PENDING' ? 'badge-warning'
         : 'badge-danger';
  }

  private msg(e: HttpErrorResponse) {
    return e.error?.message || e.error?.error || e.message || 'Failed';
  }
}